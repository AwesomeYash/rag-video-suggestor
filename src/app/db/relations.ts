import { defineRelations } from "drizzle-orm";
import * as schemas from "./schema";

export const relations = defineRelations(schemas)