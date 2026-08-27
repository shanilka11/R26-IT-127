import React, { useState, useEffect } from 'react';
import './home.css';
import { Row, Col, Card, Button } from 'react-bootstrap';
import Container from "react-bootstrap/Container";
import { useHistory } from 'react-router-dom';

const Home = () => {

    const [search, setSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [areaSearch, setAreaSearch] = useState('');

    const history = useHistory();

    useEffect(() => {
        // TODO: wire back up to the machinery fetch once the endpoint is ready
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();

        const fields = { search, category: categorySearch, area: areaSearch };
        const nonEmpty = Object.fromEntries(
            Object.entries(fields).filter(([, value]) => value !== "")
        );
        const queryParams = new URLSearchParams(nonEmpty).toString();

        history.push(queryParams ? `/all_ads?${queryParams}` : "/all_ads");
    };

    const services = [
        {
            title: "Supply",
            text: "Reliable supply, sourced and delivered on your schedule.",
            img: "/assets/img1.jpg",
        },
        {
            title: "Delivery",
            text: "Fast, tracked delivery straight to your door.",
            img: "/assets/img1.jpg",
        },
        {
            title: "Support",
            text: "Round-the-clock support whenever you need it.",
            img: "/assets/img1.jpg",
        },
    ];

    return (
        <div>
            <div id="home-desktop" className="web-view">
                <div
                    className="hero-section"
                    style={{
                        background: "url(/assets/back.jpg) center center/cover",
                    }}
                >
                    <Container>
                        <h1 className="h1-text-home">AI Railway</h1>
                        <p className="p-text-home">
                            Description
                        </p>
                    </Container>
                </div>

                <form onSubmit={handleSubmit} className="top-search-bar-container">
                    <Row className="align-items-center g-2">
                        <Col md={4}>
                            <input
                                className="form-control search-input"
                                placeholder="Search..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </Col>
                        <Col md={4}>
                            <input
                                className="form-control search-input"
                                placeholder="Category"
                                value={categorySearch}
                                onChange={(e) => setCategorySearch(e.target.value)}
                            />
                        </Col>
                        <Col md={3}>
                            <input
                                className="form-control search-input"
                                placeholder="Area"
                                value={areaSearch}
                                onChange={(e) => setAreaSearch(e.target.value)}
                            />
                        </Col>
                        <Col md={1}>
                            <Button type="submit" className="search-btn w-100">Go</Button>
                        </Col>
                    </Row>
                </form>

                {/* Service Categories */}
                <Container className="my-5">
                    <h2 className="section-heading">Our Services</h2>
                    <Row className="mt-4">
                        {services.map((service) => (
                            <Col md={4} key={service.title}>
                                <Card className="service-card">
                                    <Card.Img variant="top" src={service.img} alt={service.title} />
                                    <Card.Body>
                                        <Card.Title>{service.title}</Card.Title>
                                        <Card.Text>{service.text}</Card.Text>
                                        <Button className="learn-more-btn">Learn More</Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </div>

            {/* Mobile View */}
            <div id="home-mobile" className="mobile-view">
                <div
                    className="hero-section-mobile"
                    style={{
                        background: "url(/assets/gas_hero.jpg) center center/cover",
                    }}
                >
                    <Container>
                        <h1 className="h1-text-home-mobile">Brand Name</h1>
                        <p className="p-text-home-mobile">
                            Description
                        </p>
                        <Button className="learn-more-btn mt-3">
                            Get Started
                        </Button>
                    </Container>
                </div>

                <Container className="my-4">
                    <h2 className="section-heading">Our Services</h2>
                    <Row className="mt-3">
                        {services.map((service) => (
                            <Col xs={12} className="mb-3" key={service.title}>
                                <Card className="service-card">
                                    <Card.Img variant="top" src={service.img} alt={service.title} />
                                    <Card.Body>
                                        <Card.Title>{service.title}</Card.Title>
                                        <Card.Text>{service.text}</Card.Text>
                                        <Button className="learn-more-btn">Learn More</Button>
                                    </Card.Body>
                                </Card>
                            </Col>
                        ))}
                    </Row>
                </Container>
            </div>
        </div>
    );
}

export default Home;