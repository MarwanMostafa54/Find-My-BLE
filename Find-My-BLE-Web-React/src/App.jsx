import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LocationTracker from './components/LocationTracker';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 1000,
      retry: 3,
      retryDelay: 1000,
      refetchOnMount: true,
      refetchOnReconnect: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-screen h-screen overflow-hidden">
        <LocationTracker />
      </div>
    </QueryClientProvider>
  );
}

export default App;
