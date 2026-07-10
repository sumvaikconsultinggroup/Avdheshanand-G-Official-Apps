import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { ArticlesTable } from "./articles-table"

export default function ArticlesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-[#800020] dark:text-[#D4A017]">Articles</h1>
          <p className="text-muted-foreground">Manage your articles and blog posts.</p>
        </div>
        <Button
          asChild
          className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white hover:brightness-110 focus:ring-[#800020]/20"
        >
          <Link href="/dashboard/website/articles/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Article
          </Link>
        </Button>
      </div>

      <ArticlesTable />
    </div>
  )
}
