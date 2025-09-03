# CoLink Commerce™ System Architecture

This document provides a comprehensive overview of the CoLink Commerce™ system architecture, illustrating how all components interact to create a collaborative commerce platform for e-commerce sellers and social creators.

## System Architecture Diagram

The following diagram shows the complete system architecture of the CoLink Commerce™ platform:

\`\`\`mermaid
flowchart TB
    subgraph Client["Client Layer"]
        WebApp["Next.js Web Application"]
        MobileWeb["Mobile Web Interface"]
        PublicPages["Public Campaign Pages"]
    end

    subgraph APIGateway["API Gateway"]
        NextAPI["Next.js API Routes"]
        ExpressAPI["Express API Server"]
        AuthMiddleware["Authentication Middleware"]
        RateLimiter["Rate Limiting"]
    end

    subgraph CoreModules["Core Platform Modules"]
        subgraph MarketHub["MarketHub™"]
            ProductCatalog["Product Catalog"]
            InventorySync["Inventory Sync"]
            PlatformConnectors["Platform Connectors"]
        end
        
        subgraph FlowBuilder["FlowBuilder™"]
            CampaignBuilder["Campaign Builder"]
            PageDesigner["Page Designer"]
            BundleCreator["Bundle Creator"]
        end
        
        subgraph RevSplit["RevSplit™"]
            CommissionEngine["Commission Engine"]
            PayoutOrchestrator["Payout Orchestrator"]
            LedgerService["Ledger Service"]
        end
        
        subgraph CreatorKit["CreatorKit™"]
            LinkGenerator["Link Generator"]
            QRCodeService["QR Code Service"]
            UTMBuilder["UTM Builder"]
        end
        
        subgraph InsightBoard["InsightBoard™"]
            Analytics["Analytics Engine"]
            Attribution["Attribution Service"]
            Reporting["Reporting Service"]
        end
        
        subgraph EngagePlus["Engage+™"]
            Gamification["Gamification Engine"]
            BadgeService["Badge Service"]
            LeaderboardService["Leaderboard Service"]
        end
    end

    subgraph DataLayer["Data Layer"]
        PostgreSQL["PostgreSQL Database"]
        Redis["Redis Cache & Queue"]
        ObjectStorage["Object Storage<br>Images/Media"]
    end

    subgraph BackgroundJobs["Background Processing"]
        BullMQ["BullMQ Job Queues"]
        Workers["Worker Processes"]
        Schedulers["Scheduled Tasks"]
    end

    subgraph ExternalIntegrations["External Integrations"]
        subgraph ECommercePlatforms["E-Commerce Platforms"]
            Shopee["Shopee API"]
            Lazada["Lazada API"]
            Shopify["Shopify API"]
            WooCommerce["WooCommerce API"]
        end
        
        subgraph SocialPlatforms["Social Platforms"]
            TikTok["TikTok API"]
            Instagram["Instagram API"]
            Facebook["Facebook API"]
        end
        
        subgraph PaymentProviders["Payment Providers"]
            Stripe["Stripe Connect"]
            Xendit["Xendit"]
            DuitNow["DuitNow/FPX"]
        end
        
        subgraph SupportServices["Support Services"]
            EmailService["Email Service<br>Resend/SendGrid"]
            Analytics["PostHog Analytics"]
            CDN["Content Delivery Network"]
        end
    end

    %% Client to API connections
    WebApp --> NextAPI
    MobileWeb --> NextAPI
    PublicPages --> NextAPI
    NextAPI --> ExpressAPI
    
    %% API Gateway connections
    ExpressAPI --> AuthMiddleware
    ExpressAPI --> RateLimiter
    AuthMiddleware --> CoreModules
    RateLimiter --> CoreModules
    
    %% Core Modules to Data Layer
    CoreModules --> PostgreSQL
    CoreModules --> Redis
    CoreModules --> ObjectStorage
    
    %% Core Modules to Background Jobs
    CoreModules --> BullMQ
    BullMQ --> Workers
    Schedulers --> Workers
    Workers --> CoreModules
    
    %% External Integrations connections
    MarketHub --> ECommercePlatforms
    RevSplit --> PaymentProviders
    CreatorKit --> SocialPlatforms
    CoreModules --> SupportServices
    
    %% Background Jobs to External Integrations
    Workers --> ExternalIntegrations
    
    %% Data flow between core modules
    MarketHub <--> FlowBuilder
    FlowBuilder <--> RevSplit
    RevSplit <--> InsightBoard
    CreatorKit <--> InsightBoard
    InsightBoard <--> EngagePlus
    
    %% Style definitions
    classDef clientLayer fill:#4672b4,color:white,stroke:#333,stroke-width:1px
    classDef apiGateway fill:#47956f,color:white,stroke:#333,stroke-width:1px
    classDef coreModule fill:#de953e,color:white,stroke:#333,stroke-width:1px
    classDef dataLayer fill:#8b251e,color:white,stroke:#333,stroke-width:1px
    classDef backgroundJobs fill:#6b6b6b,color:white,stroke:#333,stroke-width:1px
    classDef externalIntegrations fill:#8a4f9e,color:white,stroke:#333,stroke-width:1px
    
    %% Apply styles
    class Client,WebApp,MobileWeb,PublicPages clientLayer
    class APIGateway,NextAPI,ExpressAPI,AuthMiddleware,RateLimiter apiGateway
    class CoreModules,MarketHub,FlowBuilder,RevSplit,CreatorKit,InsightBoard,EngagePlus,ProductCatalog,InventorySync,PlatformConnectors,CampaignBuilder,PageDesigner,BundleCreator,CommissionEngine,PayoutOrchestrator,LedgerService,LinkGenerator,QRCodeService,UTMBuilder,Analytics,Attribution,Reporting,Gamification,BadgeService,LeaderboardService coreModule
    class DataLayer,PostgreSQL,Redis,ObjectStorage dataLayer
    class BackgroundJobs,BullMQ,Workers,Schedulers backgroundJobs
    class ExternalIntegrations,ECommercePlatforms,SocialPlatforms,PaymentProviders,SupportServices,Shopee,Lazada,Shopify,WooCommerce,TikTok,Instagram,Facebook,Stripe,Xendit,DuitNow,EmailService,Analytics,CDN externalIntegrations
\`\`\`

## Order → Ledger → Payout Flow

The following diagram illustrates the flow of an order through the system, from creation to payout:

\`\`\`mermaid
sequenceDiagram
    participant Marketplace as E-Commerce Platform
    participant API as CoLink API
    participant RevSplit as RevSplit™ Engine
    participant DB as Database
    participant Queue as Job Queue
    participant Payment as Payment Provider
    participant Seller as Seller
    participant Creator as Creator

    Marketplace->>API: Order Webhook
    API->>DB: Store Order
    API->>RevSplit: Process Commission
    RevSplit->>DB: Calculate Splits
    RevSplit->>DB: Create Ledger Entries
    Note over RevSplit: platform_fee = subtotal * platform_fee_pct
    Note over RevSplit: creator_commission = subtotal * creator_pct
    Note over RevSplit: seller_take = subtotal - platform_fee - creator_commission - payment_fees
    
    API->>Queue: Schedule Payout Job
    Queue->>RevSplit: Process Pending Payouts
    RevSplit->>DB: Mark Ledger Entries as Cleared
    RevSplit->>Payment: Initiate Creator Payout
    Payment->>Creator: Transfer Funds
    RevSplit->>Payment: Initiate Seller Payout
    Payment->>Seller: Transfer Funds
    
    RevSplit->>DB: Mark Ledger Entries as Paid
    RevSplit->>API: Update Payout Status
    API->>Creator: Send Payout Notification
    API->>Seller: Send Payout Notification
\`\`\`

## Attribution & RevSplit Sequence

This diagram shows how user clicks are tracked and attributed to conversions:

\`\`\`mermaid
sequenceDiagram
    participant User as End User
    participant Campaign as Campaign Page
    participant Tracking as Tracking Service
    participant Store as E-Commerce Store
    participant Attribution as Attribution Engine
    participant RevSplit as RevSplit™ Engine
    
    User->>Campaign: Visit via Creator Link
    Campaign->>Tracking: Record Click Event
    Tracking->>User: Set Attribution Cookie
    
    User->>Store: Browse Products
    User->>Store: Purchase Product
    Store->>Tracking: Order Webhook
    
    Tracking->>Attribution: Match Order to Click
    Note over Attribution: Check within attribution window<br>(Default: 7-day click / 1-day view)
    
    Attribution->>RevSplit: Attribute Sale to Creator
    RevSplit->>RevSplit: Apply Commission Rules
    Note over RevSplit: Priority: Campaign > SKU > Product > Default
    
    RevSplit->>RevSplit: Calculate Revenue Split
    RevSplit->>RevSplit: Create Ledger Entries
\`\`\`

## Data Model (High-Level ER)

The following diagram shows the high-level entity relationships in the CoLink Commerce™ platform:

\`\`\`mermaid
erDiagram
    User ||--o{ UserOrganization : "belongs to"
    User ||--o| SellerProfile : "has"
    User ||--o| CreatorProfile : "has"
    User ||--o{ Campaign : "creates"
    User ||--o{ UserBadge : "earns"
    User }|--o{ Tier : "belongs to"
    
    Organization ||--o{ UserOrganization : "has members"
    Organization ||--o{ StoreConnection : "connects to"
    Organization ||--o{ Product : "owns"
    Organization ||--o{ CommissionRule : "defines"
    Organization ||--o{ Order : "processes"
    
    Role ||--o{ UserOrganization : "assigned to"
    
    StoreConnection ||--o{ Product : "syncs"
    StoreConnection ||--o{ Order : "receives"
    
    Product ||--o{ SKU : "has variants"
    Product ||--o{ CampaignProduct : "included in"
    Product ||--o{ CommissionRule : "has rules"
    
    SKU ||--o{ OrderItem : "purchased as"
    SKU ||--o{ CommissionRule : "has rules"
    
    Campaign ||--o{ CampaignProduct : "contains"
    Campaign ||--o{ CommissionRule : "has rules"
    Campaign ||--o{ TrackingLink : "generates"
    Campaign ||--o{ ClickEvent : "receives"
    Campaign ||--o{ ViewEvent : "receives"
    Campaign ||--o{ ConversionEvent : "attributes"
    
    Order ||--o{ OrderItem : "contains"
    Order ||--o{ LedgerEntry : "generates"
    Order ||--o| PaymentIntent : "processed by"
    
    OrderItem ||--o{ LedgerEntry : "splits revenue"
    OrderItem ||--o{ ConversionEvent : "attributes"
    
    Payout ||--o{ LedgerEntry : "includes"
    
    TrackingLink ||--o{ ClickEvent : "tracks"
    TrackingLink ||--o{ ViewEvent : "tracks"
    
    Badge ||--o{ UserBadge : "awarded as"
\`\`\`

## Deployment Architecture

The following diagram shows the deployment architecture of the CoLink Commerce™ platform:

\`\`\`mermaid
flowchart TB
    subgraph Internet["Internet"]
        Users["End Users"]
        Sellers["Sellers"]
        Creators["Creators"]
    end
    
    subgraph CDN["Content Delivery Network"]
        Assets["Static Assets"]
        Media["Media Files"]
    end
    
    subgraph VercelPlatform["Vercel Platform"]
        NextApp["Next.js Frontend"]
        EdgeFunctions["Edge Functions"]
        ServerlessFunctions["Serverless Functions"]
    end
    
    subgraph BackendInfra["Backend Infrastructure"]
        subgraph FlyIO["Fly.io / Render"]
            APIServer["Express API Server"]
            WorkerNodes["Worker Nodes"]
        end
        
        subgraph DatabaseServices["Database Services"]
            NeonDB["Neon PostgreSQL"]
            UpstashRedis["Upstash Redis"]
        end
        
        subgraph StorageServices["Storage Services"]
            S3["S3-compatible Storage"]
            SupabaseStorage["Supabase Storage"]
        end
    end
    
    subgraph ExternalServices["External Services"]
        ClerkAuth["Clerk Auth"]
        StripeAPI["Stripe API"]
        XenditAPI["Xendit API"]
        ResendEmail["Resend Email"]
        PostHogAnalytics["PostHog Analytics"]
    end
    
    subgraph ECommerce["E-Commerce Platforms"]
        ShopeeAPI["Shopee API"]
        LazadaAPI["Lazada API"]
        ShopifyAPI["Shopify API"]
        WooCommerceAPI["WooCommerce API"]
    end
    
    %% Connections
    Users --> CDN
    Sellers --> VercelPlatform
    Creators --> VercelPlatform
    
    CDN --> VercelPlatform
    VercelPlatform --> BackendInfra
    VercelPlatform --> ExternalServices
    
    FlyIO --> DatabaseServices
    FlyIO --> StorageServices
    FlyIO --> ExternalServices
    FlyIO --> ECommerce
    
    %% Styles
    classDef users fill:#4672b4,color:white,stroke:#333,stroke-width:1px
    classDef infra fill:#47956f,color:white,stroke:#333,stroke-width:1px
    classDef services fill:#de953e,color:white,stroke:#333,stroke-width:1px
    classDef external fill:#8a4f9e,color:white,stroke:#333,stroke-width:1px
    
    class Internet,Users,Sellers,Creators users
    class CDN,VercelPlatform,BackendInfra,FlyIO,DatabaseServices,StorageServices infra
    class NextApp,EdgeFunctions,ServerlessFunctions,APIServer,WorkerNodes,NeonDB,UpstashRedis,S3,SupabaseStorage services
    class ExternalServices,ClerkAuth,StripeAPI,XenditAPI,ResendEmail,PostHogAnalytics,ECommerce,ShopeeAPI,LazadaAPI,ShopifyAPI,WooCommerceAPI external
\`\`\`

## Technology Stack Summary

- **Frontend**: Next.js, TypeScript, Tailwind CSS, React Query, Zustand
- **Backend**: Node.js, Express, TypeScript, Prisma ORM
- **Database**: PostgreSQL (via Neon or Supabase)
- **Caching & Queues**: Redis, BullMQ
- **Authentication**: Clerk (primary), Auth0 (alternative)
- **Storage**: S3-compatible or Supabase Storage
- **Payments**: Stripe Connect, Xendit, DuitNow/FPX
- **Email**: Resend or SendGrid
- **Analytics**: PostHog (self-hostable)
- **Deployment**: Vercel (frontend), Fly.io/Render (backend)
- **CI/CD**: GitHub Actions
