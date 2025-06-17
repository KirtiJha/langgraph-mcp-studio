import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  GlobeAltIcon,
  PlayIcon,
  CodeBracketIcon,
  CogIcon,
  BeakerIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { GlobeAltIcon as GlobeAltIconSolid } from "@heroicons/react/24/solid";
import APIServerManager from "./APIServerManager";

const APIServerDemo: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      title: "Import OpenAPI Spec",
      description:
        "Paste your OpenAPI/Swagger specification to automatically generate endpoints",
      icon: CloudArrowUpIcon,
      color: "blue",
    },
    {
      title: "Configure Authentication",
      description:
        "Set up API keys, bearer tokens, or basic auth for secure API access",
      icon: CogIcon,
      color: "indigo",
    },
    {
      title: "Test Endpoints",
      description:
        "Validate your API endpoints work correctly before deploying",
      icon: BeakerIcon,
      color: "green",
    },
    {
      title: "Generate MCP Server",
      description:
        "Create a fully functional MCP server that exposes your API as tools",
      icon: PlayIcon,
      color: "purple",
    },
  ];

  const exampleOpenAPI = {
    openapi: "3.0.0",
    info: {
      title: "Weather API",
      version: "1.0.0",
      description: "Get current weather data for any location",
    },
    servers: [{ url: "https://api.openweathermap.org/data/2.5" }],
    paths: {
      "/weather": {
        get: {
          summary: "Get current weather",
          operationId: "getCurrentWeather",
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "City name",
            },
          ],
        },
      },
    },
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "query",
          name: "appid",
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-16">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-6 py-3 mb-8"
            >
              <GlobeAltIconSolid className="w-6 h-6 text-indigo-400" />
              <span className="text-indigo-300 font-medium">
                API-to-MCP Server Converter
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-white via-slate-200 to-slate-300 bg-clip-text text-transparent mb-6"
            >
              Convert Any API to
              <br />
              <span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                MCP Tools
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-xl text-slate-400 max-w-3xl mx-auto mb-8"
            >
              Transform REST APIs into Model Context Protocol tools with
              automatic endpoint discovery, authentication handling, and testing
              capabilities.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2">
                <PlayIcon className="w-5 h-5" />
                Try Demo
              </button>
              <button className="border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white px-8 py-4 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2">
                <CodeBracketIcon className="w-5 h-5" />
                View Code
              </button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            How It Works
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Four simple steps to transform your REST API into powerful MCP tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${
                activeStep === index
                  ? `bg-${step.color}-500/10 border-${step.color}-500/30`
                  : "bg-slate-800/50 border-slate-700/50 hover:border-slate-600/50"
              }`}
              onClick={() => setActiveStep(index)}
            >
              <div
                className={`w-12 h-12 rounded-xl bg-${step.color}-500/20 flex items-center justify-center mb-4`}
              >
                <step.icon className={`w-6 h-6 text-${step.color}-400`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {step.title}
              </h3>
              <p className="text-slate-400 text-sm">{step.description}</p>
              <div className="absolute top-4 right-4 text-xs font-medium bg-slate-700 text-slate-300 px-2 py-1 rounded">
                {index + 1}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live Demo */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Live Demo
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Try converting a real API to MCP tools right in your browser
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Example OpenAPI Spec */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CodeBracketIcon className="w-6 h-6 text-blue-400" />
                Example OpenAPI Spec
              </h3>
              <div className="bg-slate-900/50 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
                <pre className="text-slate-300">
                  {JSON.stringify(exampleOpenAPI, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex items-center gap-4 text-slate-400">
              <ArrowRightIcon className="w-5 h-5" />
              <span>Results in configured MCP server with weather tools</span>
            </div>
          </div>

          {/* Generated Tools Preview */}
          <div className="space-y-6">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircleIcon className="w-6 h-6 text-green-400" />
                Generated MCP Tools
              </h3>

              <div className="space-y-4">
                <div className="bg-slate-900/50 border border-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <BeakerIcon className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <h4 className="font-medium text-white">
                        getCurrentWeather
                      </h4>
                      <p className="text-xs text-slate-400">GET /weather</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 mb-3">
                    Get current weather data for any city
                  </p>
                  <div className="space-y-2">
                    <div className="text-xs">
                      <span className="text-slate-400">Parameters:</span>
                      <div className="ml-4 mt-1">
                        <span className="text-blue-400">q</span>
                        <span className="text-slate-500 ml-1">
                          (string, required)
                        </span>
                        <span className="text-slate-400 ml-1">- City name</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-4 py-2 text-green-300">
                    <CheckCircleIcon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Ready to use in AI models
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* API Server Manager */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Manage Your API Servers
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Create, configure, and test your API-to-MCP server conversions
          </p>
        </div>

        <div className="bg-slate-800/30 border border-slate-700/50 rounded-2xl p-6">
          <APIServerManager />
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Powerful Features
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Everything you need to convert APIs to MCP tools
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: CloudArrowUpIcon,
              title: "OpenAPI Import",
              description:
                "Automatically parse OpenAPI/Swagger specs to generate endpoints and authentication",
              color: "blue",
            },
            {
              icon: CogIcon,
              title: "Authentication Support",
              description:
                "Support for API keys, bearer tokens, basic auth, and OAuth2 flows",
              color: "indigo",
            },
            {
              icon: BeakerIcon,
              title: "Endpoint Testing",
              description:
                "Test your API endpoints directly in the interface before deployment",
              color: "green",
            },
            {
              icon: CodeBracketIcon,
              title: "Code Generation",
              description:
                "Generate production-ready MCP servers with proper error handling",
              color: "purple",
            },
            {
              icon: GlobeAltIcon,
              title: "Real-time Monitoring",
              description:
                "Monitor API calls, response times, and error rates in real-time",
              color: "amber",
            },
            {
              icon: CheckCircleIcon,
              title: "Easy Integration",
              description:
                "Seamlessly integrate with existing AI workflows and model contexts",
              color: "emerald",
            },
          ].map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 hover:border-slate-600/50 transition-all duration-300"
            >
              <div
                className={`w-12 h-12 rounded-xl bg-${feature.color}-500/20 flex items-center justify-center mb-4`}
              >
                <feature.icon className={`w-6 h-6 text-${feature.color}-400`} />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default APIServerDemo;
