import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import TeamBuilder from "./pages/TeamBuilder";
import Results from "./pages/Results";
import MijnPeloton from "./pages/MijnPeloton";
import Rules from "./pages/Rules";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Legal from "./pages/Legal";
import AdminV3 from "./pages/AdminV3";
import GiroPoule2026 from "./pages/GiroPoule2026";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/team-samenstellen" element={<TeamBuilder />} />
              <Route path="/uitslagen" element={<Results />} />
              <Route path="/mijn-peloton" element={<MijnPeloton />} />
              <Route path="/regels" element={<Rules />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/juridisch" element={<Legal />} />
              <Route path="/giro-italia-poule-2026" element={<GiroPoule2026 />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminV3 />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
