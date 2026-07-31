import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthGuard } from "@/components/AuthGuard";
import Index from "./pages/Index";
import SignIn from "./pages/SignIn";
import NotFound from "./pages/NotFound";
import Admin from "./pages/Admin";
import SchemasPage from "./pages/admin/SchemasPage";
import RulesPage from "./pages/admin/RulesPage";
import ExamplesPage from "./pages/admin/ExamplesPage";
import SnapshotsPage from "./pages/admin/SnapshotsPage";
import RecordsPage from "./pages/admin/RecordsPage";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <Routes>
    <Route path="/signin" element={<SignIn />} />
    <Route
      path="/"
      element={
        <AuthGuard>
          <Index />
        </AuthGuard>
      }
    />
    <Route
      path="/admin"
      element={
        <AuthGuard>
          <Admin />
        </AuthGuard>
      }
    >
      <Route index element={<SchemasPage />} />
      <Route path="schemas" element={<SchemasPage />} />
      <Route path="rules" element={<RulesPage />} />
      <Route path="examples" element={<ExamplesPage />} />
      <Route path="records" element={<RecordsPage />} />
      <Route path="snapshots" element={<SnapshotsPage />} />
    </Route>
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
