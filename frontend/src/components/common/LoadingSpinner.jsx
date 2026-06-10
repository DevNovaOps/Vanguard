export default function LoadingSpinner({ size = 32, className = '' }) {
  return (
    <div className={`flex-center ${className}`} style={{ padding: '2rem' }}>
      <div className="loading-spinner" style={{ width: size, height: size }} />
    </div>
  );
}
