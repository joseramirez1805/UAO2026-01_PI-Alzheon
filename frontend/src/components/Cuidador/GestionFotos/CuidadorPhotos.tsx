import { useMemo, useState } from 'react'
import { HiPencil, HiPlus, HiTrash, HiXMark } from 'react-icons/hi2'
import { toast } from 'sonner'
import { CuidadorPhoto } from '../../../services/cuidadorApi'

interface CuidadorPhotosProps {
  photos: CuidadorPhoto[]
  patientName: string
  onCreatePhoto: (data: { etiqueta: string; url_contenido?: string; descripcion?: string; imageFile?: File }) => Promise<void>
  onUpdatePhoto: (photoId: string, data: { etiqueta?: string; descripcion?: string }) => Promise<void>
  onDeletePhoto: (photoId: string) => Promise<void>
  loading?: boolean
}

export const CuidadorPhotos = ({
  photos,
  patientName,
  onCreatePhoto,
  onUpdatePhoto,
  onDeletePhoto,
  loading,
}: CuidadorPhotosProps) => {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<CuidadorPhoto | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const photoGrid = useMemo(() => {
    if (!photos.length && !loading) {
      return (
        <div className="glass-card p-10 text-center text-white">
          <p className="text-xl font-semibold mb-2">Aún no has agregado fotografías</p>
          <span className="text-white/70">Comienza agregando fotos significativas para {patientName}.</span>
        </div>
      )
    }

    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {photos.map((photo) => (
          <div key={photo._id} className="glass-card overflow-hidden group">
            <div className="relative h-52 w-full overflow-hidden">
              <img
                src={photo.url_contenido}
                alt={photo.etiqueta}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A1220]/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <p className="text-white text-lg font-semibold">{photo.etiqueta}</p>
                {photo.descripcion && (
                  <span className="text-white/70 text-sm line-clamp-2">{photo.descripcion}</span>
                )}
              </div>
              <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => {
                    setSelectedPhoto(photo)
                    setShowEditModal(true)
                  }}
                  className="p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-colors"
                >
                  <HiPencil className="text-white text-lg" />
                </button>
                <button
                  onClick={() => {
                    setSelectedPhoto(photo)
                    setShowDeleteModal(true)
                  }}
                  className="p-2 rounded-full bg-red-500/20 backdrop-blur-sm hover:bg-red-500/30 transition-colors"
                >
                  <HiTrash className="text-white text-lg" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }, [loading, photos, patientName])

  return (
    <section className="w-full px-4 pb-16 sm:px-6">
      <div className="flex items-center justify-between mb-6 text-white">
        <div>
          <p className="patient-section-title">Gestión de Fotos</p>
          <h2 className="text-3xl font-semibold">Fotografías de {patientName}</h2>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 glass-button rounded-full px-6 py-3 text-sm font-semibold"
        >
          <HiPlus className="text-xl" />
          Agregar foto
        </button>
      </div>

      {loading ? (
        <div className="glass-panel p-10 text-center text-white">
          Cargando fotografías...
        </div>
      ) : (
        photoGrid
      )}

      {showCreateModal && (
        <CreatePhotoModal
          onClose={() => setShowCreateModal(false)}
          onCreate={async (data) => {
            try {
              await onCreatePhoto(data)
              setShowCreateModal(false)
              toast.success('Foto agregada exitosamente')
            } catch (error) {
              toast.error('No se pudo agregar la foto')
            }
          }}
        />
      )}

      {showEditModal && selectedPhoto && (
        <EditPhotoModal
          photo={selectedPhoto}
          onClose={() => {
            setShowEditModal(false)
            setSelectedPhoto(null)
          }}
          onUpdate={async (data) => {
            try {
              await onUpdatePhoto(selectedPhoto._id, data)
              setShowEditModal(false)
              setSelectedPhoto(null)
              toast.success('Foto actualizada exitosamente')
            } catch (error) {
              toast.error('No se pudo actualizar la foto')
            }
          }}
        />
      )}

      {showDeleteModal && selectedPhoto && (
        <DeletePhotoModal
          photo={selectedPhoto}
          onClose={() => {
            setShowDeleteModal(false)
            setSelectedPhoto(null)
          }}
          onDelete={async () => {
            try {
              await onDeletePhoto(selectedPhoto._id)
              setShowDeleteModal(false)
              setSelectedPhoto(null)
              toast.success('Foto eliminada exitosamente')
            } catch (error) {
              toast.error('No se pudo eliminar la foto')
            }
          }}
        />
      )}
    </section>
  )
}

interface CreatePhotoModalProps {
  onClose: () => void
  onCreate: (data: { etiqueta: string; url_contenido?: string; descripcion?: string; imageFile?: File }) => Promise<void>
}

const CreatePhotoModal = ({ onClose, onCreate }: CreatePhotoModalProps) => {
  const [etiqueta, setEtiqueta] = useState('')
  const [url, setUrl] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadMode, setUploadMode] = useState<'url' | 'file'>('file') // Por defecto: subir archivo
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string>('')

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validar tipo de archivo
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor selecciona una imagen válida')
        return
      }

      // Validar tamaño (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('La imagen no debe superar los 10MB')
        return
      }

      setSelectedFile(file)
      
      // Crear preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!etiqueta.trim()) {
      toast.error('Por favor ingresa un título')
      return
    }

    if (uploadMode === 'url' && !url.trim()) {
      toast.error('Por favor ingresa una URL')
      return
    }

    if (uploadMode === 'file' && !selectedFile) {
      toast.error('Por favor selecciona una imagen')
      return
    }

    setLoading(true)
    try {
      if (uploadMode === 'file' && selectedFile) {
        await onCreate({ 
          etiqueta, 
          descripcion: descripcion || undefined,
          imageFile: selectedFile 
        })
      } else {
        await onCreate({ 
          etiqueta, 
          url_contenido: url, 
          descripcion: descripcion || undefined 
        })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-[#050914]/80" onClick={onClose} />

      <form onSubmit={handleSubmit} className="relative glass-panel w-full max-w-2xl p-6 lg:p-10 text-white my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 glass-button rounded-full p-2"
        >
          <HiXMark className="text-2xl" />
        </button>

        <h3 className="text-2xl font-semibold mb-6">Agregar Nueva Foto</h3>

        {/* Selector de modo */}
        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-full">
          <button
            type="button"
            onClick={() => setUploadMode('file')}
            className={`flex-1 py-2 px-4 rounded-full font-medium transition-all ${
              uploadMode === 'file' 
                ? 'bg-white/20 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            📤 Subir Imagen
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('url')}
            className={`flex-1 py-2 px-4 rounded-full font-medium transition-all ${
              uploadMode === 'url' 
                ? 'bg-white/20 text-white' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            🔗 Usar URL
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Título de la foto *
            </label>
            <input
              type="text"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              placeholder="Ej: Vacaciones en la playa"
              className="w-full rounded-2xl bg-white/10 px-4 py-3 border border-white/20 text-white placeholder-white/40"
              required
            />
          </div>

          {uploadMode === 'file' ? (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Seleccionar imagen *
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="flex items-center justify-center w-full h-32 rounded-2xl bg-white/10 border-2 border-dashed border-white/30 cursor-pointer hover:bg-white/15 transition-colors"
                >
                  {selectedFile ? (
                    <div className="text-center">
                      <p className="text-white font-medium">{selectedFile.name}</p>
                      <p className="text-white/60 text-sm mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-white/70 text-lg mb-1">📁</p>
                      <p className="text-white/70">Click para seleccionar una imagen</p>
                      <p className="text-white/50 text-sm mt-1">PNG, JPG, WebP (Max 10MB)</p>
                    </div>
                  )}
                </label>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                URL de la imagen *
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value)
                  setPreviewUrl(e.target.value)
                }}
                placeholder="https://ejemplo.com/imagen.jpg"
                className="w-full rounded-2xl bg-white/10 px-4 py-3 border border-white/20 text-white placeholder-white/40"
                required={uploadMode === 'url'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Descripción (opcional)
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Agrega detalles sobre esta foto..."
              rows={3}
              className="w-full rounded-2xl bg-white/10 px-4 py-3 border border-white/20 text-white placeholder-white/40"
            />
          </div>

          {previewUrl && (
            <div className="rounded-2xl overflow-hidden border border-white/20">
              <p className="text-sm text-white/70 px-4 py-2 bg-white/5">Vista previa:</p>
              <img 
                src={previewUrl} 
                alt="Vista previa" 
                className="w-full h-48 object-cover" 
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }} 
              />
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 glass-button rounded-full py-3 font-semibold disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-[#3B9CFF] py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Agregar foto'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface EditPhotoModalProps {
  photo: CuidadorPhoto
  onClose: () => void
  onUpdate: (data: { etiqueta?: string; descripcion?: string }) => Promise<void>
}

const EditPhotoModal = ({ photo, onClose, onUpdate }: EditPhotoModalProps) => {
  const [etiqueta, setEtiqueta] = useState(photo.etiqueta)
  const [descripcion, setDescripcion] = useState(photo.descripcion || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await onUpdate({ etiqueta, descripcion })
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="absolute inset-0 bg-[#050914]/80" onClick={onClose} />

      <form onSubmit={handleSubmit} className="relative glass-panel w-full max-w-2xl p-6 lg:p-10 text-white my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 glass-button rounded-full p-2"
        >
          <HiXMark className="text-2xl" />
        </button>

        <h3 className="text-2xl font-semibold mb-6">Editar Foto</h3>

        <div className="space-y-4">
          <div className="rounded-2xl overflow-hidden border border-white/20 mb-4">
                <img src={photo.url_contenido || ''} alt={photo.etiqueta} className="w-full h-48 object-cover" />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Título de la foto
            </label>
            <input
              type="text"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              className="w-full rounded-2xl bg-white/10 px-4 py-3 border border-white/20 text-white"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Descripción
            </label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={3}
              className="w-full rounded-2xl bg-white/10 px-4 py-3 border border-white/20 text-white"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 glass-button rounded-full py-3 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-full bg-[#3B9CFF] py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

interface DeletePhotoModalProps {
  photo: CuidadorPhoto
  onClose: () => void
  onDelete: () => Promise<void>
}

const DeletePhotoModal = ({ photo, onClose, onDelete }: DeletePhotoModalProps) => {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    await onDelete()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[#050914]/80" onClick={onClose} />

      <div className="relative glass-panel w-full max-w-md p-6 text-white">
        <h3 className="text-2xl font-semibold mb-4">¿Eliminar foto?</h3>
        
        <div className="rounded-2xl overflow-hidden border border-white/20 mb-4">
          <img src={photo.url_contenido || ''} alt={photo.etiqueta} className="w-full h-48 object-cover" />
        </div>

        <p className="text-white/70 mb-6">
          Estás por eliminar "<strong className="text-white">{photo.etiqueta}</strong>". 
          Esta acción también eliminará todas las grabaciones asociadas y no se puede deshacer.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 glass-button rounded-full py-3 font-semibold"
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 rounded-full bg-red-500/80 hover:bg-red-500 py-3 font-semibold disabled:opacity-50"
          >
            {loading ? 'Eliminando...' : 'Eliminar'}
          </button>
        </div>
      </div>
    </div>
  )
}
