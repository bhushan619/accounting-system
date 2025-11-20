import React,{useEffect,useState} from 'react'; import axios from 'axios';
export default function Clients(){ const [items,setItems]=useState<any[]>([]); useEffect(()=>{ axios.get(import.meta.env.VITE_API_URL + '/clients').then(r=>setItems(r.data)).catch(()=>{}); },[]); return <div><h1>Clients</h1><ul>{items.map(c=> <li key={c._id}>{c.name}</li>)}</ul></div>; }
