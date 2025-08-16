import React, { useEffect, useState, useRef } from 'react';
import { Star, Quote } from 'lucide-react';

interface TestimonialsSectionProps {
  t: (key: string) => string;
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ t }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);

  const testimonials = [
    {
      quote: t('testimonial1'),
      name: t('testimonial1Name'),
      role: t('testimonial1Role'),
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?w=100&h=100&fit=crop&crop=face',
      rating: 5
    },
    {
      quote: t('testimonial2'),
      name: t('testimonial2Name'),
      role: t('testimonial2Role'),
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?w=100&h=100&fit=crop&crop=face',
      rating: 5
    },
    {
      quote: t('testimonial3'),
      name: t('testimonial3Name'),
      role: t('testimonial3Role'),
      avatar: 'https://images.pexels.com/photos/2182970/pexels-photo-2182970.jpeg?w=100&h=100&fit=crop&crop=face',
      rating: 5
    }
  ];

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
        if (sectionRef.current) {
            observer.unobserve(sectionRef.current);
        }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
      <section ref={sectionRef} id="testimonials" className="testimonials-bg py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className={`will-animate text-4xl font-bold text-white mb-6 ${isVisible ? 'slide-in-visible' : ''}`}>
              {t('testimonialsTitle')}
            </h2>
            <p className={`will-animate text-xl text-gray-300 max-w-3xl mx-auto ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.2s' }}>
              {t('testimonialsSubtitle')}
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            {/* Main Featured Testimonial */}
            <div className={`testimonial-card rounded-2xl p-8 md:p-12 mb-12 relative will-animate ${isVisible ? 'slide-in-visible' : ''}`} style={{ animationDelay: '0.4s' }}>
              <Quote className="quote-icon absolute top-6 left-6 h-16 w-16 text-[#FFD000]" />
              
              <div key={currentTestimonial} className="testimonial-transition">
                <div className="flex star-rating justify-center mb-6">
                  {[...Array(testimonials[currentTestimonial].rating)].map((_, i) => (
                    <Star key={i} className="h-6 w-6 text-[#FFD000] fill-current" />
                  ))}
                </div>
                
                <blockquote className="text-2xl md:text-3xl text-[#061A40] font-medium text-center mb-8 leading-relaxed">
                  {testimonials[currentTestimonial].quote}
                </blockquote>
                
                <div className="flex items-center justify-center space-x-4">
                  <div className="avatar-ring p-1 rounded-full">
                    <img
                      className="h-16 w-16 rounded-full object-cover"
                      src={testimonials[currentTestimonial].avatar}
                      alt={testimonials[currentTestimonial].name}
                    />
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold text-[#061A40]">
                      {testimonials[currentTestimonial].name}
                    </div>
                    <div className="text-gray-600">
                      {testimonials[currentTestimonial].role}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Testimonial Navigation */}
            <div className="flex justify-center space-x-4">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentTestimonial(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    currentTestimonial === index
                      ? 'bg-[#FFD000] scale-125'
                      : 'bg-white/30 hover:bg-white/50'
                  }`}
                />
              ))}
            </div>
            
            {/* All Testimonials Grid */}
            <div className="grid md:grid-cols-3 gap-8 mt-16">
              {testimonials.map((testimonial, index) => (
                <div
                  key={index}
                  className={`testimonial-card rounded-xl p-6 will-animate ${isVisible ? 'slide-in-visible' : ''}`}
                  style={{ animationDelay: `${0.6 + index * 0.1}s` }}
                >
                  <div className="flex mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-[#FFD000] fill-current" />
                    ))}
                  </div>
                  <p className="text-[#061A40] mb-6 leading-relaxed">
                    {testimonial.quote.length > 100 
                      ? testimonial.quote.substring(0, 100) + '...'
                      : testimonial.quote
                    }
                  </p>
                  <div className="flex items-center space-x-3">
                    <img
                      className="h-12 w-12 rounded-full object-cover"
                      src={testimonial.avatar}
                      alt={testimonial.name}
                    />
                    <div>
                      <div className="font-semibold text-[#061A40]">{testimonial.name}</div>
                      <div className="text-sm text-gray-600">{testimonial.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
  );
};

export default TestimonialsSection;