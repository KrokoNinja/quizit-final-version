"use client"
import SinglePageWrapper from "@/components/SinglePageWrapper"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { signup } from "@/lib/actions"
import { useFormState } from "react-dom"

const Page = () => {

  const [state, formAction] = useFormState<any, FormData>(signup, "");

  return (
    <SinglePageWrapper className="flex flex-col items-center justify-center h-full">
      <h1>SignUp</h1>
      <form action={formAction} className="md:w-1/2">
        <Label htmlFor="email">Email</Label>
        <Input type="email" name="email" id="email" />
        <Label htmlFor="password">Password</Label>
        <Input type="password" name="password" id="password" />
        <Button type="submit">SignUp</Button>
      </form>
      {state?.error && <p>{state.error}</p>}
    </SinglePageWrapper>
  )
}

export default Page