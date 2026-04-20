# 🌶️ Hotel Mirchi - Booking Management System

Hotel Mirchi is a premium, high-performance booking management application designed to streamline hotel operations. Built with a modern tech stack, it provides a seamless experience for managing rooms, guests, and revenue.

![Hotel Mirchi Banner](https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?q=80&w=2070&auto=format&fit=crop)

## ✨ Key Features

- **🏨 Room Management**: Real-time availability tracking with an interactive room grid.
- **📅 Smart Booking**: Easy-to-use booking form with support for check-ins, check-outs, and guest details.
- **📊 Advanced Analytics**: Comprehensive revenue dashboard with visual charts and trends.
- **📑 Invoice Generation**: 
  - Dynamic PDF invoice generation for guests.
  - Simple invoice generator for on-the-fly billing.
  - Export bookings data in JSON format for external processing.
- **🛠️ Robust Settings**: Fully customizable business details, currency settings, and room configurations.
- **🌑 Modern UI/UX**: Built with a focus on aesthetics, featuring a responsive design and smooth animations.

## 🚀 Tech Stack

- **Frontend**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- **State Management**: [TanStack Query](https://tanstack.com/query/latest)
- **Form Handling**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **PDF Export**: [jsPDF](https://github.com/parallax/jsPDF) + [AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- **Date Utilities**: [date-fns](https://date-fns.org/)

## 📦 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or bun

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/siddhant2712/mirchi-bookings.git
   cd mirchi-bookings
   ```

2. **Install dependencies**:
   ```bash
   npm install
   # or
   bun install
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   # or
   bun dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

## 📂 Project Structure

```text
src/
├── components/   # Reusable UI components & business logic modules
├── hooks/        # Custom React hooks
├── lib/          # Utilities, types, and data stores
├── pages/        # Main application views (Dashboard, Bookings, etc.)
├── types/        # TypeScript interfaces and types
└── assets/       # Static assets like images and fonts
```

## 🛡️ License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ by [Siddhant](https://github.com/siddhant2712)
