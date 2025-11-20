import React from 'react'; import { createRoot } from 'react-dom/client'; import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Clients from './pages/Clients'; import Invoices from './pages/Invoices'; import Login from './pages/Login';
import './styles.css';
function App(){ return (<BrowserRouter><nav><Link to='/clients'>Clients</Link> <Link to='/invoices'>Invoices</Link></nav><Routes><Route path='/clients' element={<Clients/>}/><Route path='/invoices' element={<Invoices/>}/><Route path='/login' element={<Login/>}/></Routes></BrowserRouter>); }
createRoot(document.getElementById('root')!).render(<App/>);
