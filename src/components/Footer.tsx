const Footer = () => {
  return (
    <footer className="border-t border-border/40 bg-muted/30">
      <div className="container py-6">
        <p className="text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} MyOsteopathy. All rights reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
