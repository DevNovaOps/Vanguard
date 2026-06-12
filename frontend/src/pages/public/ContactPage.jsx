import { useState } from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="info-page">
      <h1><span className="gradient-text">Contact Us</span></h1>
      <p>Get in touch with our team for enterprise inquiries, support, or partnership opportunities.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', margin: '2rem 0' }}>
        {[
          { icon: Mail, title: 'Email', info: 'contact@vanguardarc.in' },
          { icon: Phone, title: 'Phone', info: '+91 11 2345 6789' },
          { icon: MapPin, title: 'Office', info: 'Rail Bhavan, New Delhi 110001' },
        ].map(item => (
          <div key={item.title} className="card" style={{ textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '12px', background: 'var(--bg-active)', marginBottom: '12px' }}>
              <item.icon size={20} color="var(--color-primary-500)" />
            </div>
            <h4 style={{ fontSize: 'var(--text-sm)', marginBottom: '4px' }}>{item.title}</h4>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{item.info}</p>
          </div>
        ))}
      </div>

      <h2>Send a Message</h2>
      {submitted ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: 'var(--color-success)', marginBottom: '0.5rem', fontSize: '2rem' }}>✓</div>
          <h3>Message Sent</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>We'll get back to you within 24 hours.</p>
        </div>
      ) : (
        <form className="contact-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="input-group">
              <label>Name</label>
              <input className="input" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Your name" />
            </div>
            <div className="input-group">
              <label>Email</label>
              <input className="input" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="you@company.com" />
            </div>
          </div>
          <div className="input-group">
            <label>Subject</label>
            <input className="input" required value={formData.subject} onChange={e => setFormData({ ...formData, subject: e.target.value })} placeholder="How can we help?" />
          </div>
          <div className="input-group">
            <label>Message</label>
            <textarea className="input" rows={5} required value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} placeholder="Tell us about your requirements..." style={{ resize: 'vertical' }} />
          </div>
          <button type="submit" className="btn btn-primary btn-lg">
            <Send size={16} /> Send Message
          </button>
        </form>
      )}
    </div>
  );
}
