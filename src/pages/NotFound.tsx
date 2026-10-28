import { Link } from 'react-router'
import PageHeading from '../components/PageHeading'

export default function NotFound() {
  return (
    <div className="page">
      <PageHeading>Page not found</PageHeading>
      <p>We could not find that page.</p>
      <Link className="btn" to="/">Go to Home</Link>
    </div>
  )
}
