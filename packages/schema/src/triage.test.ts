import { triageStoreContract } from "./testing/triageStoreContract";
import { inMemoryTriageStore } from "./triage";

triageStoreContract("inMemory", () => inMemoryTriageStore());
