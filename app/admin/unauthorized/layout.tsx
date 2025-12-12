// This layout file ensures the unauthorized page doesn't inherit the admin layout with sidebar
export default function UnauthorizedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
