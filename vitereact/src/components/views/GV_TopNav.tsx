import React, { useState, KeyboardEvent, ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/main";

const GV_TopNav: React.FC = () => {
  const navigate = useNavigate();
  const auth_token = useAppStore((state) => state.auth_token);
  const user_info = useAppStore((state) => state.user_info);
  const notifications = useAppStore((state) => state.notifications);

  const [searchInput, setSearchInput] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const submitSearch = () => {
    // Check if search input is not empty then navigate to /tasks with query parameter
    if (searchInput.trim() !== "") {
      // Navigate to /tasks with query parameter "keyword"
      navigate(`/tasks?keyword=${encodeURIComponent(searchInput.trim())}`);
      // Optionally, clear search input after submitting:
      // setSearchInput("");
      // Also, close mobile menu if open
      if (mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submitSearch();
    }
  };

  const navigateHome = () => {
    if (auth_token && auth_token.trim() !== "") {
      navigate("/dashboard");
    } else {
      navigate("/");
    }
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      <nav className="bg-white shadow px-4 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <button
            type="button"
            onClick={navigateHome}
            className="text-xl font-bold mr-4"
          >
            TaskFlow
          </button>
          <div className="hidden md:block">
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="Search tasks or projects"
              className="border rounded px-2 py-1 outline-none"
              aria-label="Search tasks or projects"
            />
            <button
              type="button"
              onClick={submitSearch}
              className="ml-2 text-blue-500 hover:text-blue-700"
            >
              Search
            </button>
          </div>
        </div>
        <div className="flex items-center">
          {auth_token && auth_token.trim() !== "" ? (
            <div className="flex items-center">
              <Link to="/profile" className="mr-4">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  {user_info.name ? user_info.name.charAt(0).toUpperCase() : "U"}
                </div>
              </Link>
              <Link to="/profile" className="relative mr-4">
                {/* Notifications Icon (using SVG) */}
                <svg
                  className="w-6 h-6 text-gray-600 hover:text-gray-800"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405
                     A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159
                     c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full px-1">
                    {notifications.length}
                  </span>
                )}
              </Link>
            </div>
          ) : (
            <div className="flex items-center">
              <Link to="/login" className="mr-4 text-blue-500 hover:text-blue-700">
                Log In
              </Link>
              <Link to="/signup" className="text-blue-500 hover:text-blue-700">
                Sign Up
              </Link>
            </div>
          )}
          <button
            type="button"
            className="md:hidden ml-2"
            onClick={toggleMobileMenu}
            aria-label="Toggle mobile menu"
          >
            <svg
              className="w-6 h-6 text-gray-600 hover:text-gray-800"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </nav>
      {mobileMenuOpen && (
        <div className="md:hidden bg-white shadow-lg p-4">
          <div className="mb-2">
            <input
              type="text"
              value={searchInput}
              onChange={handleSearchChange}
              onKeyDown={onSearchKeyDown}
              placeholder="Search tasks or projects"
              className="border rounded px-2 py-1 w-full outline-none"
              aria-label="Search tasks or projects"
            />
            <button
              type="button"
              onClick={submitSearch}
              className="mt-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-1 rounded"
            >
              Search
            </button>
          </div>
          {auth_token && auth_token.trim() !== "" ? (
            <div className="flex flex-col">
              <Link to="/dashboard" className="py-1 hover:text-blue-500">
                Dashboard
              </Link>
              <Link to="/profile" className="py-1 hover:text-blue-500">
                Profile
              </Link>
              <Link to="/tasks" className="py-1 hover:text-blue-500">
                Tasks
              </Link>
              <Link to="/projects" className="py-1 hover:text-blue-500">
                Projects
              </Link>
              <Link to="/settings" className="py-1 hover:text-blue-500">
                Settings
              </Link>
              <Link to="/team" className="py-1 hover:text-blue-500">
                Team
              </Link>
            </div>
          ) : (
            <div className="flex flex-col">
              <Link to="/" className="py-1 hover:text-blue-500">
                Home
              </Link>
              <Link to="/login" className="py-1 hover:text-blue-500">
                Log In
              </Link>
              <Link to="/signup" className="py-1 hover:text-blue-500">
                Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default GV_TopNav;