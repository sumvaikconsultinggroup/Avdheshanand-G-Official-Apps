import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { BooksTable } from "./books-table"

export default function BooksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between rounded-xl border border-[#EEE1C6] bg-[#FFF8E7] p-6 shadow-sm dark:border-[#EEE1C6]/20 dark:bg-[#800020]/10">
        <div>
          <h1 className="text-3xl font-semibold text-[#800020] dark:text-[#D4A017]">Books</h1>
          <p className="text-[#B8860B] dark:text-[#D4A017]/80">Manage your published books and writings.</p>
        </div>
        <Button
          asChild
          className="bg-gradient-to-br from-[#800020] to-[#4A0010] text-white shadow-sm hover:brightness-110 focus:ring-[#800020]/20"
        >
          <Link href="/dashboard/books/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            New Book
          </Link>
        </Button>
      </div>

      <BooksTable />
    </div>
  )
}
