# AcuLedger

A production-ready multi-tenant billing and invoicing platform.

## Features
- **Multi-tenant Architecture**: Isolated data for each organization.
- **Dashboard**: Real-time revenue and expense analytics.
- **Invoicing**: Professional PDF invoice generation.
- **Customers & Products**: Full lifecycle management.
- **Expense Tracking**: Monitor business spending.
- **Payments**: Integrated with Razorpay (requires API keys).

## Setup Instructions

### 1. Environment Variables
Add the following to your secrets/environment:
- `GEMINI_API_KEY`: (Injected automatically)
- `RAZORPAY_KEY_ID`: Your Razorpay Key ID.
- `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret.

### 2. Local Development
To run this project locally:
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Start the server: `npm run dev`.

### 3. Docker Deployment
A `Dockerfile` is provided for containerized deployment.
```bash
docker build -t nexus-billing .
docker run -p 3000:3000 nexus-billing
```

## Tech Stack
- **Frontend**: React 19, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Node.js Express (Full-stack mode).
- **Database**: Firebase Firestore.
- **Auth**: Firebase Authentication (Google).
- **PDF**: jsPDF & AutoTable.
