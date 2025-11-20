import React,{useState} from 'react'; import axios from 'axios';
export default function Login(){ const [email,setEmail]=useState(''); const [pw,setPw]=useState(''); async function submit(e:any){ e.preventDefault(); const r = await axios.post(import.meta.env.VITE_API_URL + '/auth/login',{ email, password: pw }); alert('token:'+r.data.access); }
return <form onSubmit={submit}><input value={email} onChange={e=>setEmail(e.target.value)}/><input value={pw} onChange={e=>setPw(e.target.value)}/><button>Login</button></form>; }
