import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";

const UV_Landing: React.FC = () => {
  // Local state variables as per the datamap
  const [bannerVisible, setBannerVisible] = useState<boolean>(true);
  const [ctaClicked, setCtaClicked] = useState<string>("");

  // Action handlers: update CTA clicked state before navigation
  useEffect(() => {
    if (ctaClicked) {
      console.log(`CTA button clicked: ${ctaClicked}`);
    }
  }, [ctaClicked]);

  const handleSignUpClick = () => {
    setCtaClicked("signup");
    // Additional actions (e.g., animation or analytics) can be added here
  };

  const handleLogInClick = () => {
    setCtaClicked("login");
    // Additional actions (e.g., animation or analytics) can be added here
  };

  return (
    <>
      {bannerVisible && (
        <section
          className="bg-cover bg-center w-full h-96 flex items-center justify-center"
          style={{ backgroundImage: "url(https://picsum.photos/seed/taskflow/800/400)" }}
        >
          <div className="bg-black bg-opacity-50 w-full h-full flex flex-col items-center justify-center p-4">
            <h1 className="text-4xl font-bold text-white mb-4">
              Welcome to TaskFlow
            </h1>
            <p className="text-lg text-white mb-6 text-center max-w-2xl">
              Streamline your tasks, manage your projects, and boost your productivity all in one place.
            </p>
            <div className="flex space-x-4">
              <Link
                to="/signup"
                onClick={handleSignUpClick}
                className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
              >
                Sign Up
              </Link>
              <Link
                to="/login"
                onClick={handleLogInClick}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>
      )}
      <section className="p-8">
        <h2 className="text-2xl font-bold mb-4">Key Features</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>Intuitive task management interface</li>
          <li>Flexible organization with projects and subtasks</li>
          <li>Multiple views: list view and Kanban board for efficient workflow tracking</li>
          <li>Real-time updates and notifications</li>
          <li>Responsive design optimized for all devices</li>
        </ul>
      </section>
    </>
  );
};

export default UV_Landing;