import type { Metadata } from 'next'

import { PhotoGallery } from '@/components/photo-gallery'
import { requireCurrentUser } from '@/lib/auth/session'
import { getPhotoGalleryData } from '@/lib/photos/queries'

export const metadata: Metadata = { title: 'Photos' }

const PhotosPage = async () => {
  const currentUser = await requireCurrentUser()
  const gallery = await getPhotoGalleryData(currentUser.familyId, currentUser.role)

  return (
    <div className='mx-auto max-w-[1440px] px-4 pb-[90px] pt-4 min-[521px]:px-6 min-[521px]:pt-5 min-[821px]:px-[52px] min-[821px]:pb-[70px] min-[821px]:pt-6'>
      <PhotoGallery
        familyName={currentUser.familyName}
        members={gallery.members}
        photos={gallery.photos}
      />
    </div>
  )
}

export default PhotosPage
