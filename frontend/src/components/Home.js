import React from 'react';
import './home.css';
import { Button } from 'react-bootstrap';
import { useHistory } from 'react-router-dom';

const Home = () => {

    const history = useHistory();
    const modules = ["Passenger Demand Forecasting", "Adaptive Seat Allocation", "Train Tracking & Delay Prediction", "Intelligent Fraud Detection", "Schedule Optimization"];

    return (
        <div>
            <div className="home-page">
                <section className="home-hero" style={{ backgroundImage: `url('${process.env.PUBLIC_URL}/assets/back.jpg')` }}>
                    <div className="home-hero-copy"><p className="eyebrow">SRI LANKA RAILWAYS · OPERATIONS INTELLIGENCE</p><h1>Smarter decisions for every journey.</h1><p>AI-driven decision support for demand, capacity, delays, fraud and railway scheduling.</p><div className="home-actions"><Button variant="outline-light" onClick={() => history.push('/login')}>Sign In</Button></div></div>
                    <div className="home-hero-meta"><span>01</span><span>CEYLON RAILWAY</span><span>AI OPERATIONS SYSTEM</span></div>
                </section>
                <section className="home-section"><p className="eyebrow">THE INTELLIGENCE LAYER</p><h2>One platform for the railway network.</h2><div className="module-grid">{modules.map((module, index) => <article className="module-card" key={module}><span>0{index + 1}</span><h3>{module}</h3><p>Operational insight shaped around real railway data and uncertainty.</p></article>)}</div></section>
                <section className="home-process"><div><p className="eyebrow">HOW IT WORKS</p><h2>From network signals to confident action.</h2></div><div className="process-grid">{['Data', 'AI Analytics', 'Optimization', 'Decision Support'].map((step, index) => <div className="process-step" key={step}><span>0{index + 1}</span><strong>{step}</strong></div>)}</div></section>
            </div>
        </div>
    );
}

export default Home;