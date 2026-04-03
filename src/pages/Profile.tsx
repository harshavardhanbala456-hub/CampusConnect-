import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Building2, Calendar, Shield } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
  const { userProfile, currentUser } = useAuth();

  if (!userProfile || !currentUser) {
    return <div className="text-center py-12">Loading profile...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-500 text-sm mt-1">View your personal information and settings</p>
      </div>

      <div className="bg-white shadow-sm overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="px-4 py-5 sm:px-6 flex items-center gap-4 border-b border-gray-200">
          <div className="h-16 w-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            <User className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {userProfile.name}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {userProfile.role === 'admin' ? 'Administrator' : 'Student'}
            </p>
          </div>
        </div>
        
        <div className="px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email address
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {userProfile.email}
              </dd>
            </div>
            
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 capitalize">
                {userProfile.role}
              </dd>
            </div>

            {userProfile.role === 'student' && (
              <>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Department
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userProfile.department}
                  </dd>
                </div>
                
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Year of Study
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {userProfile.year}
                  </dd>
                </div>
              </>
            )}

            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Joined
              </dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {format(new Date(userProfile.createdAt || userProfile.created_at || new Date()), 'MMMM d, yyyy')}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
