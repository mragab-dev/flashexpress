import React, { useState } from 'react';
import { Search, Package, MapPin, CheckCircle, Clock, AlertTriangle, Truck } from 'lucide-react';

interface TrackingSectionProps {
  t: (key: string) => string;
}

const TrackingSection: React.FC<TrackingSectionProps> = ({ t }) => {
  const [trackingNumber, setTrackingNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [trackingResult, setTrackingResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingNumber.trim() || !phoneNumber.trim()) return;

    setIsLoading(true);
    setTrackingResult(null);

    // Simulate API call
    setTimeout(() => {
      const statuses = [
        { 
          status: 'In Transit', 
          location: 'Cairo Sorting Facility', 
          details: 'Package has left the origin facility.',
          icon: <Truck className="h-5 w-5" />,
          color: 'text-blue-600'
        },
        { 
          status: 'Out for Delivery', 
          location: 'Alexandria Hub', 
          details: 'Your package is on its way to the final destination.',
          icon: <Package className="h-5 w-5" />,
          color: 'text-orange-600'
        },
        { 
          status: 'Delivered', 
          location: 'Your City', 
          details: 'Package delivered successfully.',
          icon: <CheckCircle className="h-5 w-5" />,
          color: 'text-green-600'
        },
        { 
          status: 'Exception', 
          location: 'Giza', 
          details: 'Delivery attempt failed. Will retry next business day.',
          icon: <AlertTriangle className="h-5 w-5" />,
          color: 'text-red-600'
        }
      ];
      
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      setTrackingResult({
        trackingId: trackingNumber.toUpperCase(),
        ...randomStatus
      });
      setIsLoading(false);
    }, 1500);
  };

  return (
      <section id="tracking" className="py-20 tracking-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-[#061A40] mb-4">
                {t('trackTitle')}
              </h2>
              <p className="text-xl text-gray-600">
                {t('trackSubtitle')}
              </p>
            </div>
            
            <div className="tracking-form rounded-2xl p-8 shadow-xl">
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="tracking-number-landing" className="sr-only">Tracking Number</label>
                         <input
                            id="tracking-number-landing"
                            type="text"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder={t('trackPlaceholder')}
                            className="tracking-input w-full px-6 py-4 text-lg rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="phone-number-landing" className="sr-only">Phone Number</label>
                        <input
                            id="phone-number-landing"
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder={t('trackPhonePlaceholder')}
                            className="tracking-input w-full px-6 py-4 text-lg rounded-xl bg-white text-gray-800 placeholder-gray-400 focus:outline-none"
                            required
                        />
                    </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="tracking-button w-full px-8 py-4 rounded-xl text-lg font-bold text-[#061A40] flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <div className="loading-spinner w-6 h-6 border-2 border-[#061A40] border-t-transparent rounded-full"></div>
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      <span>{t('trackButton')}</span>
                    </>
                  )}
                </button>
              </form>
              
              {trackingResult && (
                <div className="result-slide mt-8 p-6 bg-gray-50 rounded-xl border-l-4 border-[#FFD000]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-lg font-semibold text-[#061A40]">
                      Tracking ID: {trackingResult.trackingId}
                    </h4>
                    <div className={`flex items-center space-x-2 ${trackingResult.color}`}>
                      {trackingResult.icon}
                      <span className="font-medium">{trackingResult.status}</span>
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center space-x-3">
                      <MapPin className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Current Location</div>
                        <div className="font-medium text-[#061A40]">{trackingResult.location}</div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-500" />
                      <div>
                        <div className="text-sm text-gray-500">Details</div>
                        <div className="font-medium text-[#061A40]">{trackingResult.details}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
  );
};

export default TrackingSection;