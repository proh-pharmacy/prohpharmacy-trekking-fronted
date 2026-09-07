import React from 'react';
import { Toaster, type ToasterProps } from 'react-hot-toast';

/**
 * Brand-tailored Toaster provider for ProH Pharmacy Trekking Operations.
 * Configured with subtle 4px rounded flat UI, brand colors, and accessible contrast.
 */
export const ProHToaster: React.FC<ToasterProps> = (props) => {
  return (
    <Toaster
      position="top-right"
      gutter={10}
      containerStyle={{
        top: 20,
        right: 20,
        bottom: 20,
        left: 20,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: '#17281f',
          color: '#ffffff',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '4px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 500,
          boxShadow: '0 12px 28px -4px rgba(0, 0, 0, 0.5), 0 4px 10px -2px rgba(0, 0, 0, 0.3)',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        },
        success: {
          duration: 3500,
          iconTheme: {
            primary: '#41cc84',
            secondary: '#17281f',
          },
          style: {
            borderLeft: '4px solid #41cc84',
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: '#DE2512',
            secondary: '#ffffff',
          },
          style: {
            borderLeft: '4px solid #DE2512',
          },
        },
        loading: {
          iconTheme: {
            primary: '#41cc84',
            secondary: '#233d2f',
          },
          style: {
            borderLeft: '4px solid #41cc84',
          },
        },
      }}
      {...props}
    />
  );
};

export default ProHToaster;
