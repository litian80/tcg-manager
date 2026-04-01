import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto max-w-3xl py-12 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Privacy Policy</CardTitle>
          <CardDescription>Last updated: {new Date().toLocaleDateString()}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">1. Introduction</h2>
            <p>
              Welcome to BracketOps. We respect your privacy and are committed to protecting your personal data. 
              This privacy policy will inform you as to how we look after your personal data when you visit our website 
              and tell you about your privacy rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">2. Data We Collect</h2>
            <p>
              When you use Google to sign in to BracketOps, we collect basic profile information strictly necessary 
              to provide our services, which includes your name, email address, and profile picture. We do not use this data for anything outside of providing core application functionality to you.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">3. How We Use Your Data</h2>
            <p>
              Your data is exclusively used to create and authenticate your BracketOps account, allowing you 
              to manage your tournaments, brackets, and profile securely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">4. Data Security</h2>
            <p>
              All authentication is handled securely through Supabase and Google OAuth. We do not store or have access 
              to your Google password.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground mb-2">5. Contact</h2>
            <p>
              If you have any questions about this privacy policy or our privacy practices, please contact the developer via the support channels.
            </p>
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
