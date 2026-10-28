import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeading'

export default function NotFound() {
  return (
    <div className="page">
      <PageHeader title="Page not found" />
      <p>We could not find that page.</p>
      <Link className="btn" to="/">Go to Home</Link>
    </div>
  )
}
