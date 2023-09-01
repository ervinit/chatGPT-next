'use client'
import { useState } from 'react'
import Image from 'next/image'
import data from './assets/1.json'
import { OpenAIStream, StreamingTextResponse } from 'ai'
import { Configuration, OpenAIApi } from 'openai-edge'
import axios from 'axios'

import { useChat, type Message } from 'ai/react'
import { nanoid } from '../lib/utils'
import { useLocalStorage } from '@/lib/hooks/use-local-storage'

const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY
})
const openai = new OpenAIApi(config)

export const POST = async (req: Request) => {
  const { messages } = await req.json();
  console.log(data);
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    stream: true,
    messages
  })

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response)
  // Respond with the stream
  return new StreamingTextResponse(stream)
}

export interface ChatProps extends React.ComponentProps<'div'> {
  initialMessages?: Message[]
  id?: string
}

export default function Home() {
  type Property = {
    id: number;
    image: string;
    address: string;
    price: string;
    rooms: string;
  };

  const [list, setList] = useState<Property[]>(data);
  const [filter, setFilter] = useState('');
  const [ids, setIds] = useState<Number[]>();
  const [loading, setLoading] = useState<Boolean>(false);

  const extractIds = (responseString: string) => {
    const regex = /\[(.*?)\]/; // Regular expression to match the IDs within square brackets
    const match = responseString.match(regex); // Find the first match of the regular expression
  
    if (match) {
      const idsString = match[1]; // Extract the IDs as a string
      const ids = idsString.split(',').map(id => parseInt(id.trim())); // Split the string by comma and convert each ID to an integer
  
      return ids;
    }
  
    return [];
  }

  const getResult = async () => {
    setLoading(true);

    if (filter == '') {
      setIds(undefined);
      setLoading(false);
      return;
    }

    try {
      const response = await axios.post('https://api.openai.com/v1/chat/completions', {
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: `Given the following JSON array:\n\n\`\`\`json\n${JSON.stringify(data)}\n\`\`\`\n\nI want to select the values that match the condition: ${filter}.`},
          { role: 'user', content: 'please send me perfectly match JSON ids only (no need explanatoin text, only ids) for the condition'},
        ],
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer `+ process.env.NEXT_PUBLIC_OPENAI_API_KEY,
        },
      });
  
      const generatedMessage = response.data.choices[0].message.content;

      console.log(generatedMessage)

      const result = extractIds(generatedMessage);
      console.log(result)

      setIds(result)
      setLoading(false);

    } catch (error) {
      // Handle any errors
      console.error(error);
    }

    
  }
  
  return (
    <main className="flex min-h-screen flex-col items-center justify-content p-24">
      <div className="mb-32 text-center items-start justify-start lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left py-5">

        <label>
          Query: <input
            className='border border-gray-300 px-4 py-2 w-1/2 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-200 focus:border-blue-200'
            type="text"
            placeholder="Start Typing"
            onChange={(e) => setFilter(e.target.value)}
          />
          <button type='button' className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded' onClick={() => getResult()} style={{ marginLeft: '20px' }}>{loading? 'Loading...': 'Search'}</button>
        </label>
      </div>
      <div className="mb-32 text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <table className='border-2 w-full'>
          <thead className='border-2'>
            <tr>
              <th colSpan={1} className='px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Id</th>
              <th colSpan={1} className='px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Image</th>
              <th colSpan={1} className='px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Address</th>
              <th colSpan={1} className='px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Price</th>
              <th colSpan={1} className='px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Rooms</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {
              ids? list.map((item:any) => (
                ids.map((id, i) => <>
                  { id == item.id? <tr key={i}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.id}</td>
                  <td>
                    <Image src={`/images/${item.image}`} alt={item.address} width={200} height={120}  className="rounded-lg overflow-hidden"/></td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.rooms}</td>
                </tr>:''}
                </>)
              )): list.map((item:any, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">{item.id}</td>
                  <td><Image src={`/images/${item.image}`} alt={item.address} width={200} height={120} className="rounded-lg overflow-hidden" /></td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.address}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.price}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.rooms}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </main>
  )
}
