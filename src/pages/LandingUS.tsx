import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Heart, Brain, Calendar, Users, TrendingUp, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';

export default function LandingUS() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Heart,
      title: "Track Your Health Journey",
      description: "Easily record symptoms, medications, appointments, and health events in one secure place."
    },
    {
      icon: Brain,
      title: "AI-Powered Insights",
      description: "Get intelligent analysis of your health patterns and prepare better questions for your PCP."
    },
    {
      icon: Calendar,
      title: "Better Medical Visits",
      description: "Generate comprehensive health reports to share with your healthcare providers."
    },
    {
      icon: Users,
      title: "Family Health Management",
      description: "Manage health records for your entire family with our Family plan."
    },
    {
      icon: Shield,
      title: "Secure & Private",
      description: "Your health data is encrypted and protected with enterprise-grade security."
    },
    {
      icon: TrendingUp,
      title: "Understand Your Patterns",
      description: "Discover connections between symptoms, sleep, mood, and overall wellbeing."
    }
  ];

  const pricing = [
    {
      name: "Individual",
      price: "$10",
      period: "per month",
      features: [
        "Track 1 patient",
        "Unlimited diary entries",
        "AI health insights",
        "Professional reports",
        "Symptom & medication tracking",
        "Mood & sleep logging"
      ]
    },
    {
      name: "Family",
      price: "$18",
      period: "per month",
      popular: true,
      features: [
        "Track up to 5 family members",
        "Unlimited diary entries",
        "AI health insights",
        "Professional reports",
        "Symptom & medication tracking",
        "Mood & sleep logging",
        "Family health management"
      ]
    }
  ];

  return (
    <Layout title="MiKare Health - Your Personal Health Companion">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Take Control of Your Health Journey
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Track symptoms, medications, and health events. Get AI-powered insights. Prepare better for your doctor visits.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/signup?region=USA')}
              className="px-8 py-4 bg-white text-teal-600 hover:bg-gray-100 rounded-lg font-semibold text-lg transition-colors shadow-lg"
            >
              Start Free Trial
            </button>
            <button
              onClick={() => navigate('/signin')}
              className="px-8 py-4 bg-transparent border-2 border-white hover:bg-white/10 text-white rounded-lg font-semibold text-lg transition-colors"
            >
              Sign In
            </button>
          </div>
          <p className="text-sm mt-4 opacity-90">
            7-day free trial • No credit card required
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          Everything You Need for Better Health Management
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-gradient-to-r from-teal-500 to-blue-600 rounded-lg flex items-center justify-center mb-4">
                <feature.icon className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
            How It Works
          </h2>
          <div className="space-y-8">
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Record Your Health Events
                </h3>
                <p className="text-gray-600">
                  Easily log symptoms, medications, appointments, mood, and sleep. Our AI assistant helps you capture all the important details.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Get AI-Powered Insights
                </h3>
                <p className="text-gray-600">
                  Our AI analyzes your health data to identify patterns, correlations, and trends you might miss.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Prepare for Your Appointments
                </h3>
                <p className="text-gray-600">
                  Generate professional reports to share with your PCP or specialists. Get suggested questions to make the most of your visit.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center text-gray-900 mb-12">
          Simple, Transparent Pricing
        </h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricing.map((plan, index) => (
            <div
              key={index}
              className={`rounded-lg p-8 ${
                plan.popular
                  ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-xl scale-105'
                  : 'bg-white shadow-md'
              }`}
            >
              {plan.popular && (
                <div className="text-sm font-semibold mb-2 text-center">
                  MOST POPULAR
                </div>
              )}
              <h3 className={`text-2xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                {plan.name}
              </h3>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className={`text-sm ${plan.popular ? 'text-white/80' : 'text-gray-600'}`}>
                  {' '}{plan.period}
                </span>
              </div>
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle className={`h-5 w-5 flex-shrink-0 ${plan.popular ? 'text-white' : 'text-teal-600'}`} />
                    <span className={plan.popular ? 'text-white' : 'text-gray-600'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/signup?region=USA')}
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-white text-teal-600 hover:bg-gray-100'
                    : 'bg-teal-600 text-white hover:bg-teal-700'
                }`}
              >
                Start Free Trial
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-teal-500 to-blue-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-xl mb-8">
            Join thousands of Americans managing their health with MiKare
          </p>
          <button
            onClick={() => navigate('/signup?region=USA')}
            className="px-8 py-4 bg-white text-teal-600 hover:bg-gray-100 rounded-lg font-semibold text-lg transition-colors shadow-lg"
          >
            Start Your Free 7-Day Trial
          </button>
          <p className="text-sm mt-4 opacity-90">
            No credit card required • Cancel anytime • 100% secure
          </p>
        </div>
      </div>
    </Layout>
  );
}
