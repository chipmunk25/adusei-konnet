import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/web/components/ui/card";
// import { APITester } from "../APITester";
import "./index.css";

import logo from "./logo.svg";
import reactLogo from "./react.svg";
import { Chat } from "./chat";
import { Call } from "./call";

export function App() {
  return (
    <div className="container mx-auto p-8 text-center relative z-10">
      <div className="flex justify-center items-center gap-8 mb-8">
        <img
          src={logo}
          alt="Bun Logo"
          className="h-36 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#646cffaa] scale-120"
        />
        <img
          src={reactLogo}
          alt="React Logo"
          className="h-36 p-6 transition-all duration-300 hover:drop-shadow-[0_0_2em_#61dafbaa] [animation:spin_20s_linear_infinite]"
        />
      </div>
      <Card>
        <CardHeader className="gap-4">
          <CardTitle className="text-3xl font-bold">Bun + React</CardTitle>
          <CardDescription>
            <code className="rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono">
              Chat Room
            </code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 text-left">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Call (LiveKit)</h2>
            <Call />
          </section>

          <hr className="my-4" />

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">Chat (WebSocket sample)</h2>
            <Chat />
          </section>

          <hr className="my-4" />
        </CardContent>
      </Card>
    </div>
  );
}

export default App;
