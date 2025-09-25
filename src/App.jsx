import React from 'react';
import { Routes, Route, Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import './App.css';
import axios from 'axios';

function StoreList() {
    const [stores, setStores] = React.useState([]);
    const [filters, setFilters] = React.useState({ state: '', place: '' });
    const load = async (f = filters) => {
        const params = new URLSearchParams();
        if (f.state) params.set('state', f.state);
        if (f.place) params.set('place', f.place);
        const url = 'http://localhost:5000/api/stores' + (params.toString() ? `?${params.toString()}` : '');
        const res = await fetch(url);
        const data = await res.json().catch(() => []);
        setStores(Array.isArray(data) ? data : []);
    };
    React.useEffect(() => { load(); /* initial */ }, []);
    const onFilterChange = (e) => {
        const next = { ...filters, [e.target.name]: e.target.value };
        setFilters(next);
        // Debounced behavior could be added; simple immediate fetch here
        load(next);
    };
    return (
        <div className="container mt-3">
            <h4>Stores</h4>
            <div className="row g-2 mb-3">
                <div className="col-md-4"><input name="state" className="form-control" placeholder="Filter by state" value={filters.state} onChange={onFilterChange} /></div>
                <div className="col-md-4"><input name="place" className="form-control" placeholder="Filter by city/place" value={filters.place} onChange={onFilterChange} /></div>
                <div className="col-md-4"><button type="button" className="btn btn-outline-secondary w-100" onClick={() => { const cleared = { state: '', place: '' }; setFilters(cleared); load(cleared); }}>Clear</button></div>
            </div>
            <div className="list-group">
                {stores.map((s) => (
                    <Link key={s.storeId} to={`/stores/${s.storeId}`} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                        <span>{(s.address?.place || '') + (s.address?.state ? ', ' + s.address.state : '')}</span>
                        <span className="text-muted small">{s.phoneNumber}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function Stores() { return <StoreList />; }

function StoreDetail({ storeId }) {
    const [vcds, setVcds] = React.useState([]);
    const [qtyMap, setQtyMap] = React.useState({});
    const [filters, setFilters] = React.useState({ category: '', language: '' });
    const [sort, setSort] = React.useState({ field: '', dir: 'asc' });
    React.useEffect(() => {
        if (!storeId) return;
        fetch(`http://localhost:5000/api/stores/${storeId}/vcds`)
            .then(r => r.json())
            .then(setVcds)
            .catch(() => setVcds([]));
    }, [storeId]);
    const add = async (v) => {
        const token = localStorage.getItem('token');
        if (!token) return alert('Login first');
        const desired = Math.max(1, Number(qtyMap[v.vcdId] || 1));
        await fetch('http://localhost:5000/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ vcdId: v.vcdId, quantity: desired })
        });
        alert('Added to cart');
    };
    const visible = vcds
        .filter(v => !filters.category || String(v.category||'').toLowerCase() === filters.category.toLowerCase())
        .filter(v => !filters.language || String(v.language||'').toLowerCase() === filters.language.toLowerCase())
        .sort((a,b) => {
            if (!sort.field) return 0;
            const dir = sort.dir === 'desc' ? -1 : 1;
            if (sort.field === 'cost') return (Number(a.cost||0) - Number(b.cost||0)) * dir;
            if (sort.field === 'rating') return (Number(a.rating||0) - Number(b.rating||0)) * dir;
            return 0;
        });

    return (
        <div className="container mt-3">
            <h4>VCDs</h4>
            <div className="row g-2 mb-3">
                <div className="col-md-3"><input className="form-control" placeholder="Category (exact)" value={filters.category} onChange={e=>setFilters({...filters,category:e.target.value})} /></div>
                <div className="col-md-3"><input className="form-control" placeholder="Language (exact)" value={filters.language} onChange={e=>setFilters({...filters,language:e.target.value})} /></div>
                <div className="col-md-3">
                    <select className="form-select" value={`${sort.field}:${sort.dir}`} onChange={e=>{ const [field,dir] = e.target.value.split(':'); setSort({ field, dir }); }}>
                        <option value=":asc">Sort by</option>
                        <option value="cost:asc">Price: Low to High</option>
                        <option value="cost:desc">Price: High to Low</option>
                        <option value="rating:desc">Rating: High to Low</option>
                        <option value="rating:asc">Rating: Low to High</option>
                    </select>
                </div>
                <div className="col-md-3"><button type="button" className="btn btn-outline-secondary w-100" onClick={()=>{ setFilters({category:'',language:''}); setSort({field:'',dir:'asc'}); }}>Clear</button></div>
            </div>
            <div className="table-responsive">
                <table className="table table-striped align-middle">
                    <thead><tr><th>Name</th><th>Language</th><th>Category</th><th>Rating</th><th>Stock</th><th>Cost</th><th style={{width:140}}>Add Qty</th><th></th></tr></thead>
                    <tbody>
                        {visible.map(v => (
                            <tr key={v.vcdId}>
                                <td>{v.vcdName}</td>
                                <td>{v.language}</td>
                                <td>{v.category}</td>
                                <td>{v.rating}</td>
                                <td>{v.quantity}</td>
                                <td>{v.cost}</td>
                                <td><input type="number" min="1" className="form-control form-control-sm" value={qtyMap[v.vcdId] ?? 1} onChange={e => setQtyMap({ ...qtyMap, [v.vcdId]: e.target.value })} /></td>
                                <td><button type="button" className="btn btn-sm btn-primary" onClick={() => add(v)}>Add</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function StoreRouteWrapper() {
    const { storeId } = useParams();
    return <StoreDetail storeId={storeId} />;
}

function SearchVcds() {
    const [q, setQ] = React.useState('');
    const [rows, setRows] = React.useState([]);
    const [qtyMap, setQtyMap] = React.useState({});
    const [filters, setFilters] = React.useState({
        name: '',
        language: '',
        genre: '',
        category: '',
        ratingMin: '',
        ratingMax: '',
        stockMin: '',
        stockMax: '',
        costMin: '',
        costMax: ''
    });
    const search = async (e) => {
        e?.preventDefault();
        const url = q ? ('http://localhost:5000/api/vcds/search?vcdName=' + encodeURIComponent(q)) : 'http://localhost:5000/api/vcds/search';
        const res = await fetch(url);
        setRows(await res.json());
    };
    React.useEffect(() => { search(); }, []);
    const add = async (v) => {
        const token = localStorage.getItem('token');
        if (!token) return alert('Login first');
        const desired = Math.max(1, Number(qtyMap[v.vcdId] || 1));
        await fetch('http://localhost:5000/api/cart', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ vcdId: v.vcdId, quantity: desired })
        });
        alert('Added to cart');
    };
    const filtered = rows.filter(r => {
        if (filters.name && !String(r.vcdName || '').toLowerCase().includes(filters.name.toLowerCase())) return false;
        if (filters.language && String(r.language || '').toLowerCase() !== filters.language.toLowerCase()) return false;
        if (filters.genre && String(r.genre || '').toLowerCase() !== filters.genre.toLowerCase()) return false;
        if (filters.category && String(r.category || '').toLowerCase() !== filters.category.toLowerCase()) return false;
        const rating = Number(r.rating || 0);
        if (filters.ratingMin !== '' && rating < Number(filters.ratingMin)) return false;
        if (filters.ratingMax !== '' && rating > Number(filters.ratingMax)) return false;
        const stock = Number(r.quantity || 0);
        if (filters.stockMin !== '' && stock < Number(filters.stockMin)) return false;
        if (filters.stockMax !== '' && stock > Number(filters.stockMax)) return false;
        const cost = Number(r.cost || 0);
        if (filters.costMin !== '' && cost < Number(filters.costMin)) return false;
        if (filters.costMax !== '' && cost > Number(filters.costMax)) return false;
        return true;
    });

    return (
        <div className="container mt-3">
            <h4>Search VCDs</h4>
            <form className="mb-3" onSubmit={search}>
                <input className="form-control" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} />
            </form>
            <div className="table-responsive">
            <table className="table table-striped align-middle">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Language</th>
                        <th>Genre</th>
                        <th>Category</th>
                        <th>Rating</th>
                        <th>Stock</th>
                        <th>Cost</th>
                        <th style={{width:140}}>Add Qty</th>
                        <th></th>
                    </tr>
                    <tr>
                        <th>
                            <input className="form-control form-control-sm" placeholder="contains" value={filters.name} onChange={e=>setFilters({...filters,name:e.target.value})} />
                        </th>
                        <th>
                            <input className="form-control form-control-sm" placeholder="exact" value={filters.language} onChange={e=>setFilters({...filters,language:e.target.value})} />
                        </th>
                        <th>
                            <input className="form-control form-control-sm" placeholder="exact" value={filters.genre||''} onChange={e=>setFilters({...filters,genre:e.target.value})} />
                        </th>
                        <th>
                            <input className="form-control form-control-sm" placeholder="exact" value={filters.category||''} onChange={e=>setFilters({...filters,category:e.target.value})} />
                        </th>
                        <th>
                            <div className="d-flex gap-1">
                                <input type="number" min="1" max="5" className="form-control form-control-sm" placeholder="min" value={filters.ratingMin} onChange={e=>setFilters({...filters,ratingMin:e.target.value})} />
                                <input type="number" min="1" max="5" className="form-control form-control-sm" placeholder="max" value={filters.ratingMax} onChange={e=>setFilters({...filters,ratingMax:e.target.value})} />
                            </div>
                        </th>
                        <th>
                            <div className="d-flex gap-1">
                                <input type="number" min="0" className="form-control form-control-sm" placeholder="min" value={filters.stockMin} onChange={e=>setFilters({...filters,stockMin:e.target.value})} />
                                <input type="number" min="0" className="form-control form-control-sm" placeholder="max" value={filters.stockMax} onChange={e=>setFilters({...filters,stockMax:e.target.value})} />
                            </div>
                        </th>
                        <th>
                            <div className="d-flex gap-1">
                                <input type="number" min="0" className="form-control form-control-sm" placeholder="min" value={filters.costMin} onChange={e=>setFilters({...filters,costMin:e.target.value})} />
                                <input type="number" min="0" className="form-control form-control-sm" placeholder="max" value={filters.costMax} onChange={e=>setFilters({...filters,costMax:e.target.value})} />
                            </div>
                        </th>
                        <th></th>
                        <th>
                            <button type="button" className="btn btn-sm btn-outline-secondary" onClick={()=>setFilters({name:'',language:'',category:'',ratingMin:'',ratingMax:'',stockMin:'',stockMax:'',costMin:'',costMax:''})}>Clear</button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                        {filtered.map(r => (
                        <tr key={r.vcdId}>
                            <td>{r.vcdName}</td>
                            <td>{r.language}</td>
                                <td>{r.genre}</td>
                                <td>{r.category}</td>
                            <td>{r.rating}</td>
                            <td>{r.quantity}</td>
                            <td>{r.cost}</td>
                            <td>
                                <input type="number" min="1" className="form-control form-control-sm" value={qtyMap[r.vcdId] ?? 1} onChange={e => setQtyMap({ ...qtyMap, [r.vcdId]: e.target.value })} />
                            </td>
                            <td><button type="button" className="btn btn-sm btn-primary" onClick={() => add(r)}>Add</button></td>
                        </tr>
                    ))}
                </tbody>
            </table>
            </div>
        </div>
    );
}

function CartPage() {
    const [cart, setCart] = React.useState({ items: [] });
    const [cartTotal, setCartTotal] = React.useState(0);
    const [shipping, setShipping] = React.useState({ name: '', addressLine1: '', addressLine2: '', city: '', state: '', zip: '', country: '' });
    const [orderInfo, setOrderInfo] = React.useState(null);
    const [pay, setPay] = React.useState({ creditCardNumber: '', validFrom: '2020-01-01', validTo: '2035-12-31' });
    const [message, setMessage] = React.useState('');
    const token = localStorage.getItem('token');
    const load = async () => {
        if (!token) return;
        const res = await fetch('http://localhost:5000/api/cart', { headers: { Authorization: 'Bearer ' + token } });
        const data = await res.json();
        setCart(data);
        const total = (data.items||[]).reduce((sum,i)=> sum + (Number(i.costSnapshot||0) * Number(i.quantity||0)), 0);
        setCartTotal(total);
    };
    React.useEffect(() => { load(); }, []);
    const updateQty = async (vcdId, quantity) => {
        await fetch('http://localhost:5000/api/cart/' + vcdId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ quantity })
        });
        load();
    };
    const removeItem = async (vcdId) => {
        await fetch('http://localhost:5000/api/cart/' + vcdId, { method: 'DELETE', headers: { Authorization: 'Bearer ' + token } });
        load();
    };
    const confirmOrder = async (e) => {
        e.preventDefault();
        setMessage('');
        const res = await fetch('http://localhost:5000/api/order/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(shipping)
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({ message: 'Order failed' }));
            setMessage(err.message || 'Order failed');
            return;
        }
        const data = await res.json();
        setOrderInfo(data);
    };
    const makePayment = async (e) => {
        e.preventDefault();
        setMessage('');
        const res = await fetch('http://localhost:5000/api/payment', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify(pay)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) { setMessage(data.message || 'Payment failed'); return; }
        setMessage('Payment successful. Charged: ' + (data.totalCharged ?? ''));
        setOrderInfo(null);
        setPay({ creditCardNumber: '', validFrom: '2020-01-01', validTo: '2035-12-31' });
        load();
    };
    return (
        <div className="container mt-3">
            <h4>Cart</h4>
            {(!cart.items || cart.items.length === 0) ? <div>No items</div> : (
                <table className="table">
                    <thead><tr><th>VCD</th><th>Qty</th><th>Price</th><th>Subtotal</th><th></th></tr></thead>
                    <tbody>
                        {cart.items.map(i => (
                            <tr key={i.vcdId}>
                                <td>{i.vcdId}</td>
                                <td style={{ width: 120 }}>
                                    <input type="number" min="1" className="form-control" value={i.quantity} onChange={e => updateQty(i.vcdId, Number(e.target.value))} />
                                </td>
                                <td>{i.costSnapshot?.toFixed ? i.costSnapshot.toFixed(2) : i.costSnapshot}</td>
                                <td>{(Number(i.costSnapshot||0) * Number(i.quantity||0)).toFixed(2)}</td>
                                <td><button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeItem(i.vcdId)}>Remove</button></td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr><th colSpan="3" className="text-end">Total</th><th>{cartTotal.toFixed(2)}</th><th></th></tr>
                    </tfoot>
                </table>
            )}

            {cart.items && cart.items.length > 0 && !orderInfo && (
                <div className="mt-4" style={{ maxWidth: 640 }}>
                    <h5>Shipping details</h5>
                    <form onSubmit={confirmOrder}>
                        <div className="row g-2">
                            <div className="col-md-6"><input required className="form-control" placeholder="Name" value={shipping.name} onChange={e=>setShipping({...shipping,name:e.target.value})} /></div>
                            <div className="col-md-6"><input required className="form-control" placeholder="Address line 1" value={shipping.addressLine1} onChange={e=>setShipping({...shipping,addressLine1:e.target.value})} /></div>
                            <div className="col-md-6"><input className="form-control" placeholder="Address line 2" value={shipping.addressLine2} onChange={e=>setShipping({...shipping,addressLine2:e.target.value})} /></div>
                            <div className="col-md-4"><input required className="form-control" placeholder="City" value={shipping.city} onChange={e=>setShipping({...shipping,city:e.target.value})} /></div>
                            <div className="col-md-4"><input required className="form-control" placeholder="State" value={shipping.state} onChange={e=>setShipping({...shipping,state:e.target.value})} /></div>
                            <div className="col-md-4"><input required className="form-control" placeholder="Zip" value={shipping.zip} onChange={e=>setShipping({...shipping,zip:e.target.value})} /></div>
                            <div className="col-md-6"><input required className="form-control" placeholder="Country" value={shipping.country} onChange={e=>setShipping({...shipping,country:e.target.value})} /></div>
                        </div>
                        <button className="btn btn-success mt-3" type="submit">Place Order</button>
                    </form>
                </div>
            )}

            {orderInfo && (
                <div className="mt-4" style={{ maxWidth: 640 }}>
                    <div className="alert alert-info">Order created. Total: {orderInfo.totalCharges}</div>
                    <h5>Payment</h5>
                    <form onSubmit={makePayment} className="row g-2">
                        <div className="col-md-8"><input required className="form-control" placeholder="Credit Card Number" value={pay.creditCardNumber} onChange={e=>setPay({...pay,creditCardNumber:e.target.value})} /></div>
                        <div className="col-md-4"><input required type="date" className="form-control" placeholder="Valid From" value={pay.validFrom} onChange={e=>setPay({...pay,validFrom:e.target.value})} /></div>
                        <div className="col-md-4"><input required type="date" className="form-control" placeholder="Valid To" value={pay.validTo} onChange={e=>setPay({...pay,validTo:e.target.value})} /></div>
                        <div className="col-12"><button className="btn btn-primary" type="submit">Pay {orderInfo.totalCharges}</button></div>
                    </form>
                </div>
            )}

            {message && <div className="alert alert-warning mt-3">{message}</div>}
        </div>
    );
}

function Register() {
	const [form, setForm] = React.useState({ firstName: '', lastName: '', emailId: '', phoneNo: '', password: '' });
	const [loading, setLoading] = React.useState(false);
	const [message, setMessage] = React.useState('');
	const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
	const onSubmit = async (e) => {
		e.preventDefault();
		setMessage('');
		setLoading(true);
		try {
			const res = await axios.post('http://localhost:5000/api/users/register', form);
			setMessage('Registered. Your UserID: ' + res.data.userId);
		} catch (err) {
			setMessage(err?.response?.data?.message || 'Registration failed');
		} finally { setLoading(false); }
	};
	return (
		<div className="container mt-3" style={{ maxWidth: 480 }}>
			<h4 className="mb-3">Register</h4>
			<form onSubmit={onSubmit}>
				<div className="mb-2"><label className="form-label">First Name</label><input name="firstName" className="form-control" value={form.firstName} onChange={onChange} required /></div>
				<div className="mb-2"><label className="form-label">Last Name</label><input name="lastName" className="form-control" value={form.lastName} onChange={onChange} required /></div>
				<div className="mb-2"><label className="form-label">Email</label><input type="email" name="emailId" className="form-control" value={form.emailId} onChange={onChange} required /></div>
				<div className="mb-2"><label className="form-label">Phone</label><input name="phoneNo" className="form-control" value={form.phoneNo} onChange={onChange} required /></div>
				<div className="mb-3"><label className="form-label">Password</label><input type="password" name="password" className="form-control" value={form.password} onChange={onChange} required /></div>
				<button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Submitting...' : 'Register'}</button>
			</form>
			{message && <div className="alert alert-info mt-3">{message}</div>}
		</div>
	);
}

function Login({ onLoggedIn }) {
	const navigate = useNavigate();
	const [form, setForm] = React.useState({ emailId: '', password: '' });
	const [loading, setLoading] = React.useState(false);
	const [message, setMessage] = React.useState('');
	const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
	const onSubmit = async (e) => {
		e.preventDefault();
		setMessage('');
		setLoading(true);
		try {
			const res = await axios.post('http://localhost:5000/api/users/login', form);
			localStorage.setItem('token', res.data.token);
			onLoggedIn(res.data.token);
			navigate('/');
		} catch (err) {
			setMessage(err?.response?.data?.message || 'Login failed');
		} finally { setLoading(false); }
	};
	return (
		<div className="container mt-3" style={{ maxWidth: 420 }}>
			<h4 className="mb-3">Login</h4>
			<form onSubmit={onSubmit}>
				<div className="mb-2"><label className="form-label">Email</label><input type="email" name="emailId" className="form-control" value={form.emailId} onChange={onChange} required /></div>
				<div className="mb-3"><label className="form-label">Password</label><input type="password" name="password" className="form-control" value={form.password} onChange={onChange} required /></div>
				<button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Login'}</button>
			</form>
			{message && <div className="alert alert-info mt-3">{message}</div>}
		</div>
	);
}

function AdminLogin({ onLoggedIn }) {
    const navigate = useNavigate();
    const [form, setForm] = React.useState({ emailId: '', password: '' });
    const [loading, setLoading] = React.useState(false);
    const [message, setMessage] = React.useState('');
    const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });
    const onSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/admin/login', form);
            localStorage.setItem('adminToken', res.data.token);
            onLoggedIn(res.data.token);
            navigate('/admin');
        } catch (err) {
            setMessage(err?.response?.data?.message || 'Admin login failed');
        } finally { setLoading(false); }
    };
    return (
        <div className="container mt-3" style={{ maxWidth: 420 }}>
            <h4 className="mb-3">Admin Login</h4>
            <form onSubmit={onSubmit}>
                <div className="mb-2"><label className="form-label">Email</label><input type="email" name="emailId" className="form-control" value={form.emailId} onChange={onChange} required /></div>
                <div className="mb-3"><label className="form-label">Password</label><input type="password" name="password" className="form-control" value={form.password} onChange={onChange} required /></div>
                <button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Signing in...' : 'Login'}</button>
            </form>
            {message && <div className="alert alert-info mt-3">{message}</div>}
        </div>
    );
}

function AdminDashboard() {
    const adminToken = localStorage.getItem('adminToken');
    const [stores, setStores] = React.useState([]);
    const [newStore, setNewStore] = React.useState({ state: '', place: '', street: '', zip: '', phoneNumber: '' });
    const [vcd, setVcd] = React.useState({ storeId: '', vcdName: '', language: '', category: '', rating: 3, quantity: 1, cost: 1 });
    const [storeVcds, setStoreVcds] = React.useState([]);
    const headers = adminToken ? { Authorization: 'Bearer ' + adminToken, 'Content-Type': 'application/json' } : {};
    const loadStores = async () => {
        const res = await fetch('http://localhost:5000/api/stores');
        const data = await res.json();
        setStores(data);
    };
    React.useEffect(() => { loadStores(); }, []);
    React.useEffect(() => {
        if (vcd.storeId) {
            fetch(`http://localhost:5000/api/stores/${vcd.storeId}/vcds`).then(r => r.json()).then(setStoreVcds).catch(() => setStoreVcds([]));
        } else {
            setStoreVcds([]);
        }
    }, [vcd.storeId]);
    const addStore = async (e) => {
        e.preventDefault();
        await fetch('http://localhost:5000/api/stores', { method: 'POST', headers, body: JSON.stringify({ address: { state: newStore.state, place: newStore.place, street: newStore.street, zip: newStore.zip }, phoneNumber: newStore.phoneNumber }) });
        setNewStore({ state: '', place: '', street: '', zip: '', phoneNumber: '' });
        loadStores();
    };
    const saveStore = async (row) => {
        await fetch(`http://localhost:5000/api/stores/${row.storeId}`, { method: 'PUT', headers, body: JSON.stringify({ address: row.address, phoneNumber: row.phoneNumber }) });
        loadStores();
    };
    const removeStore = async (row) => {
        await fetch(`http://localhost:5000/api/stores/${row.storeId}`, { method: 'DELETE', headers });
        if (vcd.storeId === row.storeId) setVcd({ ...vcd, storeId: '' });
        loadStores();
    };
    const addVcd = async (e) => {
        e.preventDefault();
        if (!vcd.storeId) return alert('Select store');
        await fetch(`http://localhost:5000/api/stores/${vcd.storeId}/vcds`, { method: 'POST', headers, body: JSON.stringify({ vcdName: vcd.vcdName, language: vcd.language, category: vcd.category, rating: Number(vcd.rating), quantity: Number(vcd.quantity), cost: Number(vcd.cost) }) });
        setVcd({ ...vcd, vcdName: '', language: '', category: '', rating: 3, quantity: 1, cost: 1 });
        fetch(`http://localhost:5000/api/stores/${vcd.storeId}/vcds`).then(r => r.json()).then(setStoreVcds);
    };
    const updateVcd = async (row) => {
        await fetch(`http://localhost:5000/api/stores/${row.storeId}/vcds/${row.vcdId}`, { method: 'PUT', headers, body: JSON.stringify({ vcdName: row.vcdName, language: row.language, category: row.category, rating: Number(row.rating), quantity: Number(row.quantity), cost: Number(row.cost) }) });
        fetch(`http://localhost:5000/api/stores/${row.storeId}/vcds`).then(r => r.json()).then(setStoreVcds);
    };
    const deleteVcd = async (row) => {
        await fetch(`http://localhost:5000/api/stores/${row.storeId}/vcds/${row.vcdId}`, { method: 'DELETE', headers });
        fetch(`http://localhost:5000/api/stores/${row.storeId}/vcds`).then(r => r.json()).then(setStoreVcds);
    };
    if (!adminToken) return <Navigate to="/admin/login" />;
    return (
        <div className="container mt-3">
            <h4>Admin Dashboard</h4>
            <div className="row g-3">
                <div className="col-md-6">
                    <h5>Add Store</h5>
                    <form onSubmit={addStore}>
                        <input className="form-control mb-2" placeholder="State" value={newStore.state} onChange={e => setNewStore({ ...newStore, state: e.target.value })} />
                        <input className="form-control mb-2" placeholder="Place" value={newStore.place} onChange={e => setNewStore({ ...newStore, place: e.target.value })} />
                        <input className="form-control mb-2" placeholder="Street" value={newStore.street} onChange={e => setNewStore({ ...newStore, street: e.target.value })} />
                        <input className="form-control mb-2" placeholder="Zip" value={newStore.zip} onChange={e => setNewStore({ ...newStore, zip: e.target.value })} />
                        <input className="form-control mb-2" placeholder="Phone" value={newStore.phoneNumber} onChange={e => setNewStore({ ...newStore, phoneNumber: e.target.value })} />
                        <button className="btn btn-success" type="submit">Add Store</button>
                    </form>
                </div>
                <div className="col-md-6">
                    <h5>Add VCD</h5>
                    <form onSubmit={addVcd}>
                        <select className="form-select mb-2" value={vcd.storeId} onChange={e => setVcd({ ...vcd, storeId: e.target.value })}>
                            <option value="">Select Store</option>
                            {stores.map(s => <option key={s.storeId} value={s.storeId}>{s.address?.place} ({s.storeId})</option>)}
                        </select>
                        <input className="form-control mb-2" placeholder="Name" value={vcd.vcdName} onChange={e => setVcd({ ...vcd, vcdName: e.target.value })} />
                        <input className="form-control mb-2" placeholder="Language" value={vcd.language} onChange={e => setVcd({ ...vcd, language: e.target.value })} />
                        <input className="form-control mb-2" placeholder="Category" value={vcd.category} onChange={e => setVcd({ ...vcd, category: e.target.value })} />
                        <input type="number" className="form-control mb-2" placeholder="Rating (1-5)" value={vcd.rating} onChange={e => setVcd({ ...vcd, rating: e.target.value })} />
                        <input type="number" className="form-control mb-2" placeholder="Quantity" value={vcd.quantity} onChange={e => setVcd({ ...vcd, quantity: e.target.value })} />
                        <input type="number" className="form-control mb-2" placeholder="Cost" value={vcd.cost} onChange={e => setVcd({ ...vcd, cost: e.target.value })} />
                        <button className="btn btn-primary" type="submit">Add VCD</button>
                    </form>
                    {vcd.storeId && (
                        <div className="mt-4">
                            <h6>VCDs in Store</h6>
                            <table className="table table-sm">
                                <thead><tr><th>Name</th><th>Lang</th><th>Cat</th><th>Rate</th><th>Qty</th><th>Cost</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {storeVcds.map(row => (
                                        <tr key={row.vcdId}>
                                            <td><input className="form-control form-control-sm" value={row.vcdName} onChange={e => setStoreVcds(storeVcds.map(r => r.vcdId===row.vcdId?{...r,vcdName:e.target.value}:r))} /></td>
                                            <td><input className="form-control form-control-sm" value={row.language||''} onChange={e => setStoreVcds(storeVcds.map(r => r.vcdId===row.vcdId?{...r,language:e.target.value}:r))} /></td>
                                            <td><input className="form-control form-control-sm" value={row.category||''} onChange={e => setStoreVcds(storeVcds.map(r => r.vcdId===row.vcdId?{...r,category:e.target.value}:r))} /></td>
                                            <td style={{width:70}}><input type="number" className="form-control form-control-sm" value={row.rating||0} onChange={e => setStoreVcds(storeVcds.map(r => r.vcdId===row.vcdId?{...r,rating:Number(e.target.value)}:r))} /></td>
                                            <td style={{width:80}}><input type="number" className="form-control form-control-sm" value={row.quantity||0} onChange={e => setStoreVcds(storeVcds.map(r => r.vcdId===row.vcdId?{...r,quantity:Number(e.target.value)}:r))} /></td>
                                            <td style={{width:80}}><input type="number" className="form-control form-control-sm" value={row.cost||0} onChange={e => setStoreVcds(storeVcds.map(r => r.vcdId===row.vcdId?{...r,cost:Number(e.target.value)}:r))} /></td>
                                            <td>
                                                <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => updateVcd(row)}>Save</button>
                                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => deleteVcd(row)}>Delete</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <hr />
            <h5>Stores</h5>
            <div className="table-responsive">
                <table className="table table-sm align-middle">
                    <thead><tr><th>Place</th><th>State</th><th>Street</th><th>Zip</th><th>Phone</th><th>Actions</th></tr></thead>
                    <tbody>
                        {stores.map(s => (
                            <tr key={s.storeId}>
                                <td style={{minWidth:140}}>
                                    <input className="form-control form-control-sm" value={s.address?.place || ''} onChange={e => setStores(stores.map(x => x.storeId===s.storeId?{...x, address:{...x.address, place:e.target.value}}:x))} />
                                </td>
                                <td style={{minWidth:120}}>
                                    <input className="form-control form-control-sm" value={s.address?.state || ''} onChange={e => setStores(stores.map(x => x.storeId===s.storeId?{...x, address:{...x.address, state:e.target.value}}:x))} />
                                </td>
                                <td style={{minWidth:160}}>
                                    <input className="form-control form-control-sm" value={s.address?.street || ''} onChange={e => setStores(stores.map(x => x.storeId===s.storeId?{...x, address:{...x.address, street:e.target.value}}:x))} />
                                </td>
                                <td style={{width:100}}>
                                    <input className="form-control form-control-sm" value={s.address?.zip || ''} onChange={e => setStores(stores.map(x => x.storeId===s.storeId?{...x, address:{...x.address, zip:e.target.value}}:x))} />
                                </td>
                                <td style={{minWidth:140}}>
                                    <input className="form-control form-control-sm" value={s.phoneNumber || ''} onChange={e => setStores(stores.map(x => x.storeId===s.storeId?{...x, phoneNumber:e.target.value}:x))} />
                                </td>
                                <td style={{width:160}}>
                                    <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => saveStore(s)}>Save</button>
                                    <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeStore(s)}>Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function App() {
    const [token, setToken] = React.useState(() => localStorage.getItem('token'));
    const [adminToken, setAdminToken] = React.useState(() => localStorage.getItem('adminToken'));
    const isUserAuthed = Boolean(token);
    const isAdminAuthed = Boolean(adminToken);
    const isAuthed = isUserAuthed || isAdminAuthed;
    const logoutUser = () => { localStorage.removeItem('token'); setToken(null); window.location.assign('/'); };
    const logoutAdmin = () => { localStorage.removeItem('adminToken'); setAdminToken(null); window.location.assign('/'); };
	return (
		<>
			<nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-3">
				<div className="container-fluid">
					<Link className="navbar-brand" to="/">OVS</Link>
					<div className="collapse navbar-collapse show">
						<ul className="navbar-nav me-auto mb-2 mb-lg-0">
							<li className="nav-item"><Link className="nav-link" to="/">Home</Link></li>
                        {!isAuthed && (<>
								<li className="nav-item"><Link className="nav-link" to="/login">Login</Link></li>
								<li className="nav-item"><Link className="nav-link" to="/register">Register</Link></li>
							</>)}
							<li className="nav-item"><Link className="nav-link" to="/stores">Stores</Link></li>
							<li className="nav-item"><Link className="nav-link" to="/search">Search VCDs</Link></li>
							<li className="nav-item"><Link className="nav-link" to="/cart">Cart</Link></li>
                        <li className="nav-item"><Link className="nav-link" to="/admin">Admin</Link></li>
						</ul>
                        <ul className="navbar-nav ms-auto">
                            {isAdminAuthed && (
                                <li className="nav-item me-2"><Link className="btn btn-sm btn-outline-warning" to="/admin">Admin</Link></li>
                            )}
                            {isUserAuthed && (
                                <li className="nav-item"><button className="btn btn-sm btn-outline-light" onClick={logoutUser}>Logout</button></li>
                            )}
                            {isAdminAuthed && (
                                <li className="nav-item ms-2"><button className="btn btn-sm btn-outline-light" onClick={logoutAdmin}>Logout Admin</button></li>
                            )}
                        </ul>
					</div>
				</div>
			</nav>
            <Routes>
                <Route path="/" element={<StoreList />} />
                <Route path="/login" element={isAuthed ? <Navigate to="/" /> : <Login onLoggedIn={setToken} />} />
                <Route path="/register" element={isAuthed ? <Navigate to="/" /> : <Register />} />
                <Route path="/stores" element={<Stores />} />
                <Route path="/stores/:storeId" element={<StoreRouteWrapper />} />
                <Route path="/search" element={<SearchVcds />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/admin/login" element={isAdminAuthed ? <Navigate to="/admin" /> : <AdminLogin onLoggedIn={setAdminToken} />} />
                <Route path="/admin" element={isAdminAuthed ? <AdminDashboard /> : <Navigate to="/admin/login" />} />
				<Route path="*" element={<Navigate to="/" />} />
			</Routes>
		</>
	);
}

