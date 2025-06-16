import React, { useState, ChangeEvent, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAppStore } from "@/store/main";

interface SignupPayload {
  name: string;
  email: string;
  password: string;
}

interface UserResponse {
  uid: string;
  name: string;
  email: string;
  created_at: string;
  updated_at: string;
}

interface LoginResponse {
  token: string;
  user: UserResponse;
}

const UV_SignUp: React.FC = () => {
  const navigate = useNavigate();
  const set_auth_token = useAppStore((state) => state.set_auth_token);
  const set_user_info = useAppStore((state) => state.set_user_info);

  const [formData, setFormData] = useState<SignupPayload>({
    name: "",
    email: "",
    password: "",
  });
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Base URL for backend calls using VITE_API_BASE_URL:
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  // Handle input changes for form fields.
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific validation error on change.
    setValidationErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // Mutation that combines user registration and automatic login.
  const registrationMutation = useMutation(async (data: SignupPayload) => {
    // Call registration API: POST /api/users 
    await axios.post(`${apiBaseUrl}/api/users`, data);
    // After registration, call login API: POST /api/login using the same email and password.
    const loginResponse = await axios.post<LoginResponse>(`${apiBaseUrl}/api/login`, {
      email: data.email,
      password: data.password,
    });
    return loginResponse.data;
  }, {
    onSuccess: (data: LoginResponse) => {
      // Set the auth token and user info in the global state.
      set_auth_token(data.token);
      set_user_info(data.user);
      setIsSubmitting(false);
      // Redirect to Dashboard after successful sign up & login.
      navigate("/dashboard");
    },
    onError: (error: unknown) => {
      setIsSubmitting(false);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        setValidationErrors({ global: error.response.data.message });
      } else {
        setValidationErrors({ global: "Registration failed. Please try again." });
      }
    }
  });

  // Handle form submission.
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Basic client-side validation.
    const errors: { [key: string]: string } = {};
    if (!formData.name.trim()) {
      errors.name = "Name is required.";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required.";
    }
    if (!formData.password.trim()) {
      errors.password = "Password is required.";
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setIsSubmitting(true);
    // Submit registration & login.
    registrationMutation.mutate(formData);
  };

  return (
    <>
      <div className="max-w-md mx-auto mt-10 p-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-center">Sign Up</h2>
        {validationErrors.global && (
          <div className="mb-4 text-center text-red-500">
            {validationErrors.global}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-gray-700">
              Name
            </label>
            <input
              type="text"
              name="name"
              id="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              aria-invalid={!!validationErrors.name}
              className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
            {validationErrors.name && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>
          <div>
            <label htmlFor="email" className="block text-gray-700">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              aria-invalid={!!validationErrors.email}
              className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
            {validationErrors.email && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
            )}
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-700">
              Password
            </label>
            <input
              type="password"
              name="password"
              id="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              aria-invalid={!!validationErrors.password}
              className="w-full border px-3 py-2 rounded-md focus:outline-none focus:ring focus:border-blue-300"
            />
            {validationErrors.password && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
            )}
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            {isSubmitting ? "Submitting..." : "Sign Up"}
          </button>
        </form>
        <p className="mt-4 text-center">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-500 hover:underline">
            Log In
          </Link>
        </p>
      </div>
    </>
  );
};

export default UV_SignUp;