# LeadOS Technical Documentation

## 1. Executive Summary

LeadOS is a comprehensive lead management and automation platform developed by BM TechX for ABM Groups. This enterprise-grade application serves as a central hub for managing leads, automating sales workflows, coordinating marketing campaigns, and providing advanced SEO and local business management tools. The platform integrates multiple business verticals into a unified interface, enabling seamless operations across sales, content creation, search engine optimization, and Google Business Profile management.

The system architecture follows a modern full-stack approach, leveraging React for the frontend interface and Node.js with Express for the backend API. PostgreSQL serves as the primary relational database, while Socket.io enables real-time communication between clients and servers. The platform connects with external services including Meta (Facebook/WhatsApp), Google Business Profile, various AI providers, and multiple third-party marketing tools.

This technical documentation provides an in-depth analysis of the application's architecture, technology choices, database design, API structure, and module organization. The document serves as a reference for developers maintaining and extending the platform, offering insights into the system's design decisions and implementation patterns.

## 2. Architecture Overview

The LeadOS application follows a client-server architecture with clear separation between the frontend presentation layer, backend business logic layer, and data persistence layer. This three-tier architecture enables independent scaling and maintenance of each layer while maintaining secure communication through well-defined API contracts.

### 2.1 Frontend Architecture

The frontend application is built using React 19, a contemporary JavaScript library for building user interfaces. React provides a component-based architecture that promotes reusability and maintainability across the extensive feature set of LeadOS. The application uses Vite as its build tool, offering fast development server startup and optimized production builds through modern bundling techniques.

Routing within the application is handled by React Router DOM version 7, which provides declarative routing capabilities for navigating between the various views and modules. The router configuration in App.jsx demonstrates a comprehensive routing structure with over forty distinct routes spanning multiple business modules including SalesOS, Alliance Dashboard, Content OS, Thedal SEO Suite, and Mafiya Local Business Tools.

State management in the application relies on React's built-in Context API for global state requirements. The ClientContext serves as the primary global state container, managing client data, subscription plans, and active client selection across the application. This approach avoids the complexity of external state management libraries while providing sufficient capability for the application's requirements.

The API communication layer is encapsulated in a dedicated service class located at src/services/api.js. This LeadOSAPI class provides a comprehensive interface for all backend communication, handling authentication tokens, request formatting, response parsing, and error handling. The service supports various HTTP methods and includes specialized methods for file uploads with progress tracking.

### 2.2 Backend Architecture

The backend server operates on Node.js with Express framework, providing a robust and scalable API server. The server runs on port 3600 by default (configurable through environment variables) and serves both the RESTful API endpoints and static assets such as uploaded files. The server implements middleware for security, logging, and request preprocessing.

Express 5.2 forms the foundation of the backend, offering improved performance and async error handling compared to earlier versions. The server integrates Socket.io for real-time bidirectional communication, enabling features such as live message updates and notification delivery without requiring page refreshes.

Authentication on the backend uses JSON Web Tokens (JWT) with bcrypt for password hashing. The authentication middleware validates tokens on protected routes, while an internal authentication mechanism allows service-to-service communication through API keys. Password hashing employs bcrypt with a cost factor of 12, balancing security with reasonable authentication performance.

### 2.3 Database Architecture

PostgreSQL serves as the primary database system, providing robust relational data storage with support for complex queries, transactions, and JSON data types. The database connection is managed through the pg library, with connection pooling enabled for efficient resource utilization.

The database schema has been designed to accommodate multiple business modules within a unified structure. Key tables include leads for storing prospect information, conversations for managing communication threads, messages for individual communications, clients for brand and business management, and specialized tables for each module's data requirements. The schema includes appropriate indexes for query optimization and foreign key constraints for data integrity.

The database connection pool is configured with environment variables for host, port, database name, username, and password. The system automatically migrates ID columns to BIGINT type to accommodate large phone numbers and lead IDs from external sources like Meta (Facebook), preventing integer overflow issues.

## 3. Technology Stack

The LeadOS platform employs a modern technology stack chosen for performance, developer experience, and ecosystem support. Each technology has been selected to meet specific requirements of the application while maintaining overall system coherence.

### 3.1 Frontend Technologies

React 19 serves as the core UI framework, providing the component architecture and rendering engine for the application. The framework's virtual DOM implementation offers efficient updates by minimizing actual DOM manipulations, which is particularly important for the real-time messaging features in LeadOS. React's hooks API (useState, useEffect, useContext) provides modern state management patterns without requiring class-based components.

Vite 8 acts as the build tool and development server. Vite offers significantly faster startup times compared to webpack-based solutions by leveraging native ES modules in the browser during development. For production builds, Vite uses Rollup for optimized bundling with code splitting and tree shaking capabilities.

React Router DOM 7 handles client-side routing, enabling navigation between views without server roundtrips. The router supports dynamic route parameters, nested routes, and programmatic navigation through the useNavigate hook. Route protection is implemented through conditional rendering based on authentication state.

Axios provides HTTP client capabilities for API communication from the frontend. While the application primarily uses the fetch API through the custom LeadOSAPI service, axios is available for specific use cases requiring its interceptors and request transformation features.

UI components utilize lucide-react for icons, providing a consistent and lightweight icon library. The application includes custom CSS styling through CSS files (index.css, alliance.css, ContentOS.css) and inline styles for component-specific styling.

Data visualization uses recharts, a composable charting library built on React components. This enables the creation of dashboards and reports with line charts, bar charts, pie charts, and area charts as needed across various views.

Real-time features on the frontend use socket.io-client, connecting to the backend Socket.io server for live updates. This enables instant message delivery, notification display, and collaborative features across the platform.

Additional frontend dependencies include react-hot-toast for toast notifications, emoji-picker-react for emoji selection in messages, react-virtuoso for efficient rendering of large lists, and html2pdf.js for generating PDF reports.

### 3.2 Backend Technologies

Node.js provides the JavaScript runtime for the backend server, enabling server-side execution of JavaScript and access to the extensive npm package ecosystem. The runtime handles concurrent connections efficiently through its event-driven, non-blocking I/O model.

Express 5.2 serves as the web application framework, providing routing, middleware composition, and HTTP server functionality. Express's minimalist design allows precise control over request handling while maintaining flexibility for adding features through third-party middleware.

PostgreSQL serves as the relational database system, providing ACID-compliant transactions, complex query capabilities, and robust data integrity mechanisms. The database stores all persistent data including leads, messages, clients, and module-specific information.

Socket.io enables real-time bidirectional communication between clients and the server. The library provides automatic reconnection, room-based messaging, and fallback transport mechanisms for compatibility across different network environments.

Authentication and security libraries include bcryptjs for password hashing, jsonwebtoken for JWT token generation and verification, and helmet for setting security-related HTTP headers. The cors middleware handles Cross-Origin Resource Sharing configuration.

The server integrates with numerous external APIs including Meta's WhatsApp Business API, Google APIs (Analytics, Business Profile, AI), OpenAI, and Groq SDK for AI capabilities. File handling uses multer for multipart form data processing and xlsx for Excel file parsing.

Additional backend dependencies include node-cron for scheduled task execution, nodemailer for email sending, csv-parser for CSV file processing, cheerio for HTML parsing, jimp for image manipulation, and pdf-parse for PDF document processing.

### 3.3 Development Tools

The development environment uses nodemon for automatic server restarts during development. The frontend development server provided by Vite supports hot module replacement for instant feedback during development.

ESLint with the eslint-plugin-react-hooks ensures code quality and catches common React programming errors. The configuration extends eslint-recommended rules and includes React-specific linting rules.

Environment variables configure the application through .env files. The project supports different environments through .env.example, .env.production, and server-specific .env files, enabling configuration management across development, staging, and production environments.

## 4. Core Modules

LeadOS organizes its functionality into several distinct business modules, each addressing specific operational needs. These modules share common infrastructure while providing specialized interfaces and functionality for their respective domains.

### 4.1 SalesOS Module

The SalesOS module serves as the core lead management and sales automation component. It encompasses lead capture, tracking, communication, and conversion management. The module integrates with Meta's WhatsApp Business API for direct customer communication, enabling automated messaging workflows and manual intervention when needed.

Key features of the SalesOS module include lead import from various sources (CSV uploads, web forms, API integrations), lead scoring based on engagement metrics, automated follow-up sequences, and pipeline management for tracking leads through conversion stages. The module maintains conversation history, unread message counts, and last contact information for each lead.

The sales dashboard provides real-time metrics including today's revenue, monthly revenue trends, brand-wise revenue breakdown, lead source analysis, conversion rates, pending follow-ups, and SLA breach monitoring. These metrics help sales teams prioritize their efforts and track performance against targets.

Sales tasks management enables tracking of sales activities including calls, meetings, and follow-ups. Tasks can be assigned to team members, given priority levels, and associated with specific leads or clients. The system supports task reminders and overdue notifications.

### 4.2 Alliance OS Module

Alliance OS provides tools for partner collaboration and lead distribution across an alliance network. The module enables organizations to share leads, track partner performance, and coordinate marketing efforts across multiple entities.

The Alliance Dashboard provides a unified view of all alliance activities including lead flow, partner performance metrics, and revenue attribution. Pipeline management tools help track leads as they move through various stages of the alliance workflow.

Lead upload functionality allows partners to submit leads through CSV import with validation and deduplication. The system identifies duplicate leads based on phone number normalization and prevents redundant processing.

The Alliance Inbox provides a communication channel for inter-partner messaging and lead handoff notifications. Messages are tied to specific leads and include context about the lead's status and history.

Knowledge Base functionality enables sharing of documents, guidelines, and resources across the alliance network. Content can be uploaded, organized by categories, and searched by partners.

Prompt Manager allows administrators to create and manage AI prompts used in automated communications. Prompts can be customized for different scenarios and partner configurations.

### 4.3 Content OS Module

Content OS automates social media content creation and publishing across multiple platforms. The module leverages AI for content generation, caption writing, and visual asset creation while maintaining brand consistency.

Content approval workflows enable review and approval of AI-generated content before publication. Multiple approval stages ensure content quality and brand alignment. The scheduler enables planning content publication across different time zones and optimal posting times.

Social account management connects various social media platforms including Facebook, Instagram, LinkedIn, and YouTube. OAuth-based authentication enables secure access to social accounts without storing credentials.

Folder monitoring watches Google Drive folders for new media assets, automatically processing and queueing them for content generation. This enables automated workflows where new assets trigger content creation pipelines.

Content generation uses AI models to create posts based on brand guidelines, previous successful content, and platform-specific requirements. The system generates multiple variations for A/B testing and human refinement.

Reach and engagement analytics track the performance of published content across platforms. Failed post detection identifies and reports publishing issues for manual intervention.

### 4.4 Thedal SEO Suite

Thedal provides a comprehensive SEO management suite for agencies managing client websites. The module integrates multiple SEO tools and data sources into a unified dashboard for efficient client management.

Client onboarding captures client website information, Google Analytics credentials, search console access, and SEO objectives. The system stores configuration details and establishes API connections for data retrieval.

Keyword tracking monitors keyword rankings across search engines and geographic locations. Historical data enables trend analysis and ranking progress visualization. The system supports tracking of hundreds of keywords per client.

Google Search Console integration provides insights into search impressions, clicks, and average positions. The integration enables identification of top-performing pages and search queries driving organic traffic.

On-page audit functionality analyzes web pages for SEO issues including missing meta tags, heading structure problems, image optimization, and content quality metrics. Audit results include prioritized recommendations for improvements.

Content Factory assists in creating SEO-optimized content by analyzing top-ranking pages and generating content outlines or drafts. The system provides keyword density guidance and semantic analysis.

Monthly reporting generates comprehensive SEO performance reports combining data from multiple sources. Reports include ranking changes, traffic trends, and actionable recommendations.

Rank drop alerts notify users when significant ranking declines occur, enabling quick response to potential issues. Configurable thresholds and notification preferences customize alert behavior.

SERPs radar monitors search engine results pages for specific queries and competitors. The tool tracks ranking positions over time and identifies opportunities for improvement.

Gap Hunter analyzes content gaps between a client's website and competitor sites, identifying topics and keywords where content creation would provide competitive advantage.

Schema Library manages structured data markup for client websites. The system provides pre-built schema templates and validates implementation.

Competitor Spy tracks competitor SEO activities including content publishing, backlink acquisition, and ranking movements. This competitive intelligence informs strategy decisions.

Backlink Tracker monitors the backlink profile of client websites, tracking new links, lost links, and overall link quality metrics.

Local SEO Bridge provides tools for managing local business SEO, including citation management, NAP (Name, Address, Phone) consistency checking, and local ranking optimization.

Plan subscription management handles client SEO service tiers with different feature access. Subscription billing and feature gating ensure appropriate access control.

### 4.5 Mafiya Local Business Tools

Mafiya focuses on Google Business Profile (GBP) management for local businesses. The module provides tools for managing business listings, reviews, posts, and insights.

GBP Brain provides AI-powered suggestions for business profile optimization based on industry best practices and competitor analysis.

Client management stores business information including name, address, phone, categories, and attributes. The system maintains historical changes and supports bulk operations.

Google Business Profile integration connects to actual business listings through Google's API. The integration enables profile updates, post publishing, and review management directly from LeadOS.

Review management tracks customer reviews across platforms, enables response drafting (with AI assistance), and monitors review metrics. Sentiment analysis helps identify trends in customer feedback.

Post management creates and publishes Google Posts including offers, events, and updates. The system schedules posts for optimal timing and tracks performance.

Citation management tracks business listings across various directories and data aggregators. NAP consistency checking identifies and helps resolve discrepancies.

Loyalty program features enable businesses to manage customer loyalty programs directly through their Google Business Profile, including loyalty points and special offers.

Street Posts appears to be a content management feature for local engagement, possibly related to community posts or neighborhood-specific content.

Rivals competitive analysis tracks local competitors' Google Business Profile activities including posts, photos, and review responses.

Usage analytics provides insights into how clients use the Mafiya features, helping identify adoption patterns and optimization opportunities.

## 5. API Structure

The LeadOS API follows RESTful conventions with JSON request and response bodies. The API is organized around resources and uses standard HTTP methods for operations.

### 5.1 Authentication Endpoints

Authentication uses JWT-based stateless authentication. The login endpoint accepts email and password credentials, validates them against the database, and returns a JWT token along with user information. Tokens expire after seven days and must be included in subsequent requests via the Authorization header.

Password change functionality allows authenticated users to update their password by providing the current password and new password. The endpoint validates the current password before applying the change.

### 5.2 Lead Management Endpoints

The leads resource provides CRUD operations for lead management. The list endpoint supports filtering by status, brand, source, and search terms with pagination support. Individual lead retrieval, creation, update, and deletion are available through respective endpoints.

Message endpoints handle communication with leads. The send message endpoint integrates with WhatsApp for actual message delivery. Upload endpoints support multimedia content including images, videos, and documents.

Conversation endpoints manage message threads, supporting operations such as marking conversations as read, pinning important messages, starring messages for follow-up, and adding emoji reactions.

### 5.3 Client and Brand Management

Clients represent brands or businesses in the system. The API supports creating clients with associated configuration, updating client details, and managing client-specific settings such as WhatsApp integration and brand voice guidelines.

Plan management handles subscription tiers and feature access. The API provides endpoints for listing available plans, creating subscriptions, and managing plan features.

### 5.4 Content and Campaign Endpoints

Content endpoints manage the Content OS module, providing operations for content creation, approval workflows, scheduling, and publishing. Batch operations enable efficient processing of multiple content items.

Campaign endpoints handle marketing campaign management including creation, execution, and log retrieval. Campaigns can be triggered manually or scheduled for automated execution.

### 5.5 Module-Specific Endpoints

Each business module exposes specialized endpoints appropriate to its functionality. The Thedal module provides endpoints for SEO audits, keyword tracking, client management, and reporting. The Mafiya module exposes endpoints for GBP management, review handling, and citation tracking. The Alliance module includes endpoints for pipeline management, knowledge base operations, and inter-partner communication.

## 6. Database Schema

The PostgreSQL database schema has been designed to accommodate the diverse data requirements of the LeadOS platform while maintaining normalization and referential integrity.

### 6.1 Core Tables

The users table stores authentication information including email, password hash, role, and timestamps. Each user has a role that determines their permissions within the system.

The leads table contains prospective customer information including name, phone, email, status, source attribution, and brand association. The table includes fields for custom properties and conversion tracking.

Conversations table tracks communication threads associated with leads. Each conversation maintains unread message counts, last message timestamps, and status indicators.

Messages table stores individual communications within conversations. The table supports various message types including text, image, video, and document. Message metadata includes delivery status, read status, and reaction information.

Clients table represents businesses or brands using the platform. Client records store business information, configuration settings, subscription status, and integration credentials.

### 6.2 Module-Specific Tables

Content tables manage the Content OS module including social accounts, content items, approval workflows, and publication schedules.

Thedal tables store SEO-related data including client configurations, keyword tracking data, audit results, and report history.

Mafiya tables capture Google Business Profile data including business information, reviews, posts, and citation tracking.

Alliance tables manage partnership data including pipeline information, knowledge base articles, and inter-partner communications.

### 6.3 Indexes and Optimization

The database includes strategic indexes for common query patterns. Phone number fields use functional indexes for normalized searching, enabling efficient deduplication even with different phone number formats. Composite indexes support common filter combinations, reducing query execution time for dashboard and list views.

## 7. Security Implementation

Security considerations are integrated throughout the LeadOS architecture, addressing authentication, authorization, data protection, and secure communication.

### 7.1 Authentication Security

User passwords are hashed using bcrypt with a cost factor of 12, providing strong protection against brute-force and rainbow table attacks. Passwords are never stored in plain text or transmitted without encryption.

JWT tokens expire after seven days, limiting the window of opportunity for token compromise. The authentication middleware validates tokens on every protected route request, ensuring only authenticated users access system resources.

### 7.2 API Security

The server implements Helmet middleware for setting security-related HTTP headers including X-Content-Type-Options, X-Frame-Options, and X-XSS-Protection. CORS configuration restricts access to authorized origins while allowing necessary cross-origin requests for the frontend application.

Internal API keys enable service-to-service communication without requiring user authentication. These keys are stored as environment variables and validated through dedicated middleware.

### 7.3 Data Protection

Database credentials are stored in environment variables rather than in source code, preventing accidental exposure through version control. The database connection uses SSL/TLS when available.

Sensitive data handling follows least-privilege principles. Users access only data relevant to their role and assigned brands. Lead data is segmented by brand, ensuring users see only authorized information.

### 7.4 Input Validation

The Express JSON middleware validates and parses request bodies, preventing malformed input from reaching business logic. Parameterized database queries prevent SQL injection attacks by separating query structure from user data.

## 8. Real-Time Features

Socket.io enables real-time bidirectional communication between the server and connected clients, providing immediate updates without polling.

### 8.1 Message Delivery

When a new message is received (through webhook from WhatsApp or other sources), the server emits a socket event to relevant clients. This enables instant display of incoming messages without page refresh.

### 8.2 Notifications

System notifications including new lead assignments, task reminders, and alert triggers are broadcast through socket connections. Users receive immediate awareness of important events.

### 8.3 Collaborative Features

Real-time capabilities support collaborative workflows where multiple users work on the same data. Conversation status, task assignments, and approval states sync immediately across all connected clients.

## 9. Integrations

LeadOS integrates with numerous external services to provide comprehensive functionality across its modules.

### 9.1 Meta Integration

The platform integrates with Meta's WhatsApp Business API for sending and receiving messages. The integration supports text, multimedia, and interactive message types. Webhook endpoints receive incoming messages and delivery status updates.

Facebook leads integration captures lead form submissions directly into the LeadOS lead management system, enabling immediate follow-up on fresh leads.

### 9.2 Google Integrations

Google Analytics provides traffic and conversion data for SEO reporting in the Thedal module. OAuth-based authentication enables secure access to analytics data.

Google Search Console integration provides search performance data including impressions, clicks, and average positions. The integration supports multiple properties per client.

Google Business Profile (through Mafiya module) enables management of local business listings including business information, posts, reviews, and photos.

Google Drive integration (for Content OS) monitors folders for new media assets, triggering automated content creation workflows.

### 9.3 AI Providers

OpenAI integration provides language model capabilities for content generation, caption writing, and conversational AI features. The integration uses API keys for authentication.

Groq SDK provides high-performance inference for AI features requiring low latency responses. The system can route requests to different AI providers based on feature requirements.

Google Gemini provides additional AI capabilities through Google's generative AI models.

### 9.4 Payment Integration

Razorpay integration enables payment link generation for lead invoicing and payment collection. The integration supports payment status webhooks for transaction tracking.

## 10. Deployment Considerations

The LeadOS application is designed for deployment on cloud infrastructure with considerations for scalability, reliability, and maintainability.

### 10.1 Environment Configuration

The application uses environment variables for all configuration including database credentials, API keys, and feature flags. The .env file structure supports different environments (development, staging, production) with appropriate values for each.

### 10.2 Backend Deployment

The Node.js backend can be deployed using PM2 process manager for production environments, providing automatic restarts, log management, and cluster mode for utilizing multiple CPU cores. Alternatively, container orchestration platforms like Kubernetes can manage the service for auto-scaling and self-healing capabilities.

### 10.3 Frontend Deployment

The frontend builds to static files through Vite, which can be served from any web server or CDN. The build output includes optimized JavaScript bundles with code splitting for efficient loading.

### 10.4 Database Considerations

PostgreSQL requires proper backup strategies including regular automated backups and point-in-time recovery capability for production environments. Connection pooling should be configured based on expected concurrent users to optimize database resource utilization.

## 11. Development Patterns

The codebase follows consistent patterns that facilitate maintenance and feature development.

### 11.1 Component Organization

React components follow a pattern of presentational components for UI rendering and container components for data fetching and state management. Components are organized by feature within the views directory, with shared components in the components directory.

### 11.2 API Service Pattern

The LeadOSAPI service class provides a consistent interface for all backend communication. New endpoints can be added as methods on this class, ensuring uniform handling of authentication, error handling, and response parsing.

### 11.3 Backend Route Organization

Backend routes are organized by feature in the routes directory, with each feature having its own route file. This organization scales well as new features are added and prevents route file bloat.

### 11.4 Database Query Patterns

Database queries use parameterized queries to prevent SQL injection. Complex queries are composed using query builders or raw SQL strings with appropriate comments explaining their purpose.

## 12. Conclusion

LeadOS represents a comprehensive, modular platform for lead management and business automation. The architecture balances performance, maintainability, and feature richness through thoughtful technology choices and clear separation of concerns. The platform serves multiple business verticals through specialized modules while sharing common infrastructure for authentication, data storage, and real-time communication.

The technical foundation enables continuous feature development and scaling to meet growing business needs. Understanding this architecture provides the context necessary for effective maintenance, troubleshooting, and future enhancement of the LeadOS platform.
