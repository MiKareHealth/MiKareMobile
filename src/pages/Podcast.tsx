import React from 'react';
import { Mic, Calendar, Play, ExternalLink } from 'lucide-react';
import Layout from '../components/Layout';

export default function Podcast() {
  // TODO: Replace with actual podcast data
  const podcastInfo = {
    name: "MiKare Health Podcast",
    description: "Your weekly dose of health insights, wellness tips, and expert interviews to help you take control of your health journey.",
    spotifyUrl: "https://open.spotify.com/show/PODCAST_ID", // Replace with actual
    appleUrl: "https://podcasts.apple.com/podcast/PODCAST_ID", // Replace with actual
  };

  // TODO: Replace with actual episodes from RSS feed or API
  const episodes = [
    {
      id: 1,
      title: "Getting Started with Health Tracking",
      description: "Learn the basics of tracking your health data and how it can improve your medical visits.",
      date: "2025-01-15",
      duration: "28:45",
      url: "#"
    },
    {
      id: 2,
      title: "Understanding Mental Health & Sleep",
      description: "Dr. Sarah Johnson discusses the connection between mental health, sleep quality, and physical wellbeing.",
      date: "2025-01-08",
      duration: "35:12",
      url: "#"
    },
    {
      id: 3,
      title: "Preparing Questions for Your Doctor",
      description: "How to make the most of your medical appointments with better preparation and questions.",
      date: "2025-01-01",
      duration: "24:30",
      url: "#"
    }
  ];

  return (
    <Layout title="Podcast">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-teal-500 to-blue-600 rounded-full flex items-center justify-center">
              <Mic className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {podcastInfo.name}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {podcastInfo.description}
          </p>
        </div>

        {/* Listen On */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Listen On</h2>
          <div className="flex flex-wrap gap-4">
            <a
              href={podcastInfo.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="h-5 w-5" />
              Spotify
            </a>
            <a
              href={podcastInfo.appleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              <ExternalLink className="h-5 w-5" />
              Apple Podcasts
            </a>
          </div>
        </div>

        {/* TODO: Replace with embedded player */}
        <div className="bg-gray-100 rounded-lg p-8 mb-8 text-center">
          <Mic className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            Podcast player embed will appear here
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Add Spotify or Apple Podcasts embed code to src/pages/Podcast.tsx
          </p>
        </div>

        {/* Episodes List */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Episodes</h2>
          <div className="space-y-4">
            {episodes.map((episode) => (
              <div key={episode.id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Play className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {episode.title}
                    </h3>
                    <p className="text-gray-600 mb-3">
                      {episode.description}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {new Date(episode.date).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                      <div>{episode.duration}</div>
                    </div>
                  </div>
                  <a
                    href={episode.url}
                    className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Listen
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subscribe CTA */}
        <div className="mt-12 bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Never Miss an Episode</h2>
          <p className="mb-6">
            Subscribe to get notified when we release new episodes
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href={podcastInfo.spotifyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white text-teal-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Subscribe on Spotify
            </a>
            <a
              href={podcastInfo.appleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-white text-teal-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Subscribe on Apple
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
