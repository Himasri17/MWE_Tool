// src/pages/HomePage/HomePage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css'; // If you're using the CSS version

const HomePage = () => {
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate('/login');
  };

  const FeatureCard = ({ icon, title }) => (
    <div className="feature-card">
      <div className="feature-icon">{icon}</div>
      <h3 className="feature-title">{title}</h3>
    </div>
  );

  return (
    <div className="home-page">
      {/* App Bar */}
      <header className="app-bar">
        <div className="app-bar-content">
          <div className="logo-container">
            <img 
              src="/logo.png" 
              alt="Logo" 
              className="logo"
            />
          </div>
          
          <button
            onClick={handleGetStarted}
            className="login-button"
          >
            <span>👤</span>
            Sign Up / Login
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="gradient-overlay"></div>
        
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Multiword Expression<br />
              Annotation Tool
            </h1>
            <p className="hero-subtitle">
              A powerful and intuitive platform designed for annotating Multiword Expressions 
              in Indian languages with precision and ease.
            </p>
            <button
              onClick={handleGetStarted}
              className="get-started-button"
            >
              Get Started
            </button>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="about-section">
        <div className="about-card">
          <h2 className="about-title">What is MWE Annotation?</h2>
          <p className="about-description">
            Multiword Expressions (MWEs) are phrases that consist of multiple words but convey 
            a single, often non-compositional meaning. Our platform provides a state-of-the-art 
            annotation environment specifically designed for Indian languages, helping researchers 
            and linguists create valuable NLP datasets.
          </p>
        </div>
      </section>

      {/* Key Features Section */}
      <section className="features-section">
        <h2 className="features-title">Key Features</h2>
        <div className="features-grid">
          <FeatureCard 
            icon="🌐" 
            title="Indian Language Support" 
          />
          <FeatureCard 
            icon="👆" 
            title="Intuitive Interface" 
          />
          <FeatureCard 
            icon="📊" 
            title="MWE Classification" 
          />
          <FeatureCard 
            icon="📈" 
            title="Enhanced NLP" 
          />
          <FeatureCard 
            icon="📥" 
            title="Export Options" 
          />
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="cta-section">
        <h2 className="cta-title">Ready to Start Annotating?</h2>
        <button
          onClick={handleGetStarted}
          className="cta-button"
        >
          Start Annotating Now
        </button>
      </section>

      {/* Footer */}
      <footer className="footer">
        <p className="footer-text">© 2025 MWE Annotation Tool</p>
      </footer>
    </div>
  );
};

export default HomePage;