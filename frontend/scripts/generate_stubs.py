import os

pages_dir = r"c:\SEM4\lexcase\frontend\src\pages"
stubs = {
    "Users.jsx": "Users Management",
    "Analytics.jsx": "Reports & Analytics",
    "Settings.jsx": "System Settings",
    "Appointments.jsx": "Appointments",
    "Invoices.jsx": "Invoices & Payments",
    "Messages.jsx": "Messages",
    "Profile.jsx": "My Profile"
}

stub_template = """import React from "react";
import {{ Card, CardContent, CardHeader, CardTitle, CardDescription }} from "@/components/ui/card";

export default function {component_name}() {{
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-serif text-zinc-900 tracking-tight">{title}</h1>
        <p className="text-sm text-zinc-500 mt-1">This module is currently under construction.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Feature implementation in progress...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center border-2 border-dashed border-zinc-200 rounded-sm">
            <span className="text-zinc-400">Coming Soon</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}}
"""

def generate_stubs():
    for filename, title in stubs.items():
        component_name = filename.split(".")[0]
        filepath = os.path.join(pages_dir, filename)
        content = stub_template.format(component_name=component_name, title=title)
        with open(filepath, "w") as f:
            f.write(content)
        print(f"Created {filename}")

if __name__ == "__main__":
    generate_stubs()
