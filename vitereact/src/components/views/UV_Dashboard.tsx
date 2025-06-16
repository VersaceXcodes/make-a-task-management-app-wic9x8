import React from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useAppStore } from "@/store/main";

interface DashboardStatistics {
  total_tasks: number;
  pending: number;
  in_progress: number;
  completed: number;
}

interface Deadline {
  task_id: string;
  title: string;
  due_date: string;
}

interface DashboardData {
  task_statistics: DashboardStatistics;
  upcoming_deadlines: Deadline[];
}

const UV_Dashboard: React.FC = () => {
  const token = useAppStore((state) => state.auth_state.token);
  const navigate = useNavigate();

  // Function to fetch dashboard data from the backend
  const fetchDashboardData = async (): Promise<DashboardData> => {
    const response = await axios.get(
      `${import.meta.env.VITE_API_BASE_URL || "http://localhost:3000"}/api/dashboard`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    return response.data;
  };

  // useQuery to fetch dashboard data when the view loads
  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<DashboardData, Error>(["dashboard"], fetchDashboardData, {
    enabled: !!token, // Only run if token is available (user is authenticated)
  });

  // Handler for navigating to the Create Task view
  const handleQuickCreateTask = () => {
    navigate("/tasks/create");
  };

  return (
    <>
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : isError ? (
          <div className="text-center text-red-500 py-8">
            {error?.message || "Error fetching dashboard data"}
          </div>
        ) : (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-xl font-semibold">Total Tasks</h2>
                <p className="text-3xl font-bold">{data?.task_statistics.total_tasks}</p>
              </div>
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-xl font-semibold">Pending</h2>
                <p className="text-3xl font-bold">{data?.task_statistics.pending}</p>
              </div>
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-xl font-semibold">In Progress</h2>
                <p className="text-3xl font-bold">{data?.task_statistics.in_progress}</p>
              </div>
              <div className="bg-white shadow rounded p-4">
                <h2 className="text-xl font-semibold">Completed</h2>
                <p className="text-3xl font-bold">{data?.task_statistics.completed}</p>
              </div>
            </div>
            {/* Upcoming Deadlines List */}
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">Upcoming Deadlines</h2>
              {data?.upcoming_deadlines.length ? (
                <ul className="list-disc pl-6">
                  {data.upcoming_deadlines.map((deadline) => (
                    <li key={deadline.task_id} className="mb-2">
                      <Link
                        to={`/tasks/${deadline.task_id}`}
                        className="text-blue-500 hover:underline"
                      >
                        {deadline.title}
                      </Link>
                      <span className="ml-2 text-gray-600">
                        (Due: {new Date(deadline.due_date).toLocaleString()})
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No upcoming deadlines.</p>
              )}
            </div>
            {/* Quick Create Task Button */}
            <div>
              <button
                onClick={handleQuickCreateTask}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              >
                Quick Create Task
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

export default UV_Dashboard;