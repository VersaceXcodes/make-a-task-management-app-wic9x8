import React, { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

/* Import Shared Global Views */
import GV_TopNav from '@/components/views/GV_TopNav.tsx';
import GV_Sidebar from '@/components/views/GV_Sidebar.tsx';
import GV_Footer from '@/components/views/GV_Footer.tsx';

/* Import Unique Views */
import UV_Login from '@/components/views/UV_Login.tsx';
import UV_Registration from '@/components/views/UV_Registration.tsx';
import UV_ForgotPassword from '@/components/views/UV_ForgotPassword.tsx';
import UV_Dashboard from '@/components/views/UV_Dashboard.tsx';
import UV_Profile from '@/components/views/UV_Profile.tsx';
import UV_CreateTask from '@/components/views/UV_CreateTask.tsx';
import UV_EditTask from '@/components/views/UV_EditTask.tsx';
import UV_TaskList from '@/components/views/UV_TaskList.tsx';
import UV_TaskBoard from '@/components/views/UV_TaskBoard.tsx';
import UV_TaskDetail from '@/components/views/UV_TaskDetail.tsx';
import UV_NotificationCenter from '@/components/views/UV_NotificationCenter.tsx';
import UV_SearchResults from '@/components/views/UV_SearchResults.tsx';
import UV_ProjectList from '@/components/views/UV_ProjectList.tsx';
import UV_ProjectDetail from '@/components/views/UV_ProjectDetail.tsx';
import UV_CreateProject from '@/components/views/UV_CreateProject.tsx';

/* Import Global Store from Zustand */
import { useAppStore } from '@/store/main';

/* 
  Create a QueryClient with default options,
  disabling refetch on window focus to improve performance.
*/
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

/* Global Error Boundary Component */
class ErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(/* error: any */) {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 text-red-500">
          Sorry, something went wrong.
        </div>
      );
    }
    return this.props.children;
  }
}

/* ProtectedRoute component to guard private routes */
const ProtectedRoute: React.FC = () => {
  const isAuthenticated = useAppStore(
    (state) => state.auth_state.is_authenticated
  );

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

const App: React.FC = () => {
  // Retrieve authentication state and realtime initializer from the global store
  const isAuthenticated = useAppStore((state) => state.auth_state.is_authenticated);
  const token = useAppStore((state) => state.auth_state.token);
  const initRealtime = useAppStore((state) => state.init_realtime);

  // Initialize realtime functionality if a token is present
  useEffect(() => {
    if (token) {
      initRealtime(token);
    }
  }, [token, initRealtime]);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        {/* Global Top Navigation Bar */}
        <GV_TopNav />
        
        {/* Main Content Area */}
        <div className="flex flex-1">
          {/* Conditionally render the Sidebar for authenticated users */}
          {isAuthenticated && (
            <aside className="w-64 bg-gray-100">
              <GV_Sidebar />
            </aside>
          )}
          <main className="flex-1 p-4">
            <Routes>
              <Route path="/login" element={<UV_Login />} />
              <Route path="/register" element={<UV_Registration />} />
              <Route path="/forgot_password" element={<UV_ForgotPassword />} />
              <Route path="/dashboard" element={<UV_Dashboard />} />
              <Route path="/profile" element={<UV_Profile />} />
              <Route path="/tasks/create" element={<UV_CreateTask />} />
              <Route path="/tasks/edit/:task_id" element={<UV_EditTask />} />
              <Route path="/tasks/list" element={<UV_TaskList />} />
              <Route path="/tasks/board" element={<UV_TaskBoard />} />
              <Route path="/tasks/:task_id" element={<UV_TaskDetail />} />
              <Route path="/notifications" element={<UV_NotificationCenter />} />
              <Route path="/search" element={<UV_SearchResults />} />
              <Route path="/projects" element={<UV_ProjectList />} />
              <Route path="/projects/:project_id" element={<UV_ProjectDetail />} />
              <Route path="/projects/create" element={<UV_CreateProject />} />
            </Routes>
          </main>
        </div>

        {/* Global Footer */}
        <GV_Footer />
      </div>
    </QueryClientProvider>
  );
};

export default App;