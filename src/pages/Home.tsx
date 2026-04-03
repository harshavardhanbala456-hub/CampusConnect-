import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { BellRing, Users, ShieldCheck, ArrowRight } from 'lucide-react';

export default function Home() {
  const { currentUser } = useAuth();

  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-3xl">
        <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Never miss an</span>
          <span className="block text-indigo-600">important update again.</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          CampusConnect is the centralized hub for all university announcements. Stay informed about exams, events, holidays, and general notices tailored just for you.
        </p>
        <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
          <div className="rounded-md shadow">
            <Link
              to="/register"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10 transition-colors"
            >
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
          <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
            <Link
              to="/login"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10 transition-colors"
            >
              Log In
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-24 grid grid-cols-1 gap-8 sm:grid-cols-3 max-w-5xl w-full">
        <div className="pt-6">
          <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-sm border border-gray-100 h-full">
            <div className="-mt-6">
              <div>
                <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                  <BellRing className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Real-time Updates</h3>
              <p className="mt-5 text-base text-gray-500">
                Get instant access to the latest announcements from your department and university administration.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-sm border border-gray-100 h-full">
            <div className="-mt-6">
              <div>
                <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                  <Users className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Targeted Delivery</h3>
              <p className="mt-5 text-base text-gray-500">
                Filter announcements by your specific department and year so you only see what matters to you.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6">
          <div className="flow-root bg-white rounded-lg px-6 pb-8 shadow-sm border border-gray-100 h-full">
            <div className="-mt-6">
              <div>
                <span className="inline-flex items-center justify-center p-3 bg-indigo-500 rounded-md shadow-lg">
                  <ShieldCheck className="h-6 w-6 text-white" aria-hidden="true" />
                </span>
              </div>
              <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">Verified Sources</h3>
              <p className="mt-5 text-base text-gray-500">
                All announcements are posted by verified university administrators, ensuring authenticity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
