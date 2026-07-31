import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { JsonMapper } from "@/components/mapper/JsonMapper";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <JsonMapper />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
