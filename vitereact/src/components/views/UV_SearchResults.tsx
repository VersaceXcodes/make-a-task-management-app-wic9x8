import React, { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

// Define the Task interface based on the datamap schema
interface Task {
  task_id: string;
  title: string;
  description: string;
  due_date: string;
  priority: string;
  status: string;
}

const fetchSearchResults = async (query: string, token: string): Promise<Task[]> => {
  const baseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
  const response = await axios.get(`${baseUrl}/api/tasks`, {
    params: { query },
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
  // Expecting the API returns: { tasks: Task[] }
  return response.data.tasks;
};

const UV_SearchResults: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryParam = searchParams.get("query") || "";
  const token = useAppStore((state) => state.auth_state.token);
  const [sortOption, setSortOption] = useState<string>("relevance");

  // Use react-query to fetch search results; refetch whenever queryParam changes.
  const { data: searchResults, isLoading, isError, error } = useQuery<Task[], Error>(
    ["searchResults", queryParam],
    () => fetchSearchResults(queryParam, token),
    { enabled: !!queryParam && !!token }
  );

  // Client-side sorting of the search results based on the selected sort option
  let sortedResults: Task[] = searchResults ? [...searchResults] : [];
  if (sortOption === "due_date") {
    sortedResults.sort((a, b) => {
      const dateA = a.due_date ? new Date(a.due_date).getTime() : 0;
      const dateB = b.due_date ? new Date(b.due_date).getTime() : 0;
      return dateA - dateB;
    });
  } else if (sortOption === "priority") {
    // Define an order where high comes first, then medium, then low.
    const priorityOrder: { [key: string]: number } = { high: 1, medium: 2, low: 3 };
    sortedResults.sort((a, b) => {
      const prioA = priorityOrder[a.priority.toLowerCase()] || 999;
      const prioB = priorityOrder[b.priority.toLowerCase()] || 999;
      return prioA - prioB;
    });
  }
  // For "relevance", we simply use the default order returned by the backend

  return (
    <>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Search Results</h1>
        <p className="mt-2">
          Results for query: <span className="font-medium">{queryParam}</span>
        </p>
      </div>
      <div className="mb-4 flex items-center space-x-4">
        <label htmlFor="sort" className="font-medium">Sort By:</label>
        <select
          id="sort"
          value={sortOption}
          onChange={(e) => setSortOption(e.target.value)}
          className="border border-gray-300 rounded p-1"
        >
          <option value="relevance">Relevance</option>
          <option value="due_date">Due Date</option>
          <option value="priority">Priority</option>
        </select>
      </div>
      {isLoading && (
        <div className="text-center">
          <p>Loading search results...</p>
        </div>
      )}
      {isError && (
        <div className="text-center text-red-600">
          <p>Error fetching search results: {error?.message}</p>
        </div>
      )}
      {!isLoading && !isError && sortedResults.length === 0 && (
        <div className="text-center">
          <p>No results found.</p>
        </div>
      )}
      {!isLoading && !isError && sortedResults.length > 0 && (
        <div className="grid grid-cols-1 gap-4">
          {sortedResults.map((task) => (
            <div key={task.task_id} className="p-4 border rounded hover:bg-gray-50">
              <Link to={`/tasks/${task.task_id}`} className="text-xl font-semibold text-blue-600 hover:underline">
                {task.title}
              </Link>
              <p className="mt-1 text-gray-700">{task.description}</p>
              <div className="mt-2 flex items-center space-x-4">
                <span className="text-sm text-gray-500">
                  Due: {task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}
                </span>
                <span className="text-sm text-gray-500">Priority: {task.priority}</span>
                <span className="text-sm text-gray-500">Status: {task.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default UV_SearchResults;