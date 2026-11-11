import { getSession } from "@/lib/auth/getSession";
import { SearchBox } from "./search-box";

export async function SearchSection() {
  const session = await getSession();

  return <SearchBox signedIn={session != null} />;
}
