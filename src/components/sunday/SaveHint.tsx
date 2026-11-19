import { Link } from 'react-router'
import { sundayContent as text } from '../../content'
import { LeafIcon } from '../Icons'

/** Shown when nobody is logging: runs are not saved until a name is added on the Planting Log. */
export default function SaveHint() {
  return (
    <div className="callout callout-tip sd-save-hint">
      <LeafIcon />
      <p>
        {text.saveHint} <Link to="/log">{text.saveHintLink}</Link>
      </p>
    </div>
  )
}
