import React, { useEffect } from 'react'
import { Theme } from '../context/ThemeContext'

export interface ResourceEditForm {
  title: string
  type: string
  tags: string[]
  categories: string[]
  link_url: string
  link_protocol: string
}

export interface ResourceData {
  id?: string
  title: string
  type?: string
  link_url?: string
  tags?: string[]
  categories?: string[]
}

interface ResourceModalProps {
  isOpen: boolean
  isEditing: boolean
  modalData: ResourceData
  editForm: ResourceEditForm
  theme: Theme
  resourceTypes: string[]
  apiUrl: (path: string) => string
  authHeaders: () => Record<string, string>
  stripProtocol: (url: string) => string
  getProtocol: (url: string) => string
  buildFullUrl: (protocol: string, url: string) => string
  onClose: () => void
  onEditClick: () => void
  onDelete: () => Promise<void>
  onSave: () => Promise<void>
  onEditFormChange: (form: ResourceEditForm) => void
  onOpenTagSearch: () => void
  onOpenCategorySearch: () => void
  onLoad: () => Promise<void>
}

export const ResourceModal: React.FC<ResourceModalProps> = ({
  isOpen,
  isEditing,
  modalData,
  editForm,
  theme,
  resourceTypes,
  apiUrl,
  authHeaders,
  stripProtocol,
  getProtocol,
  buildFullUrl,
  onClose,
  onEditClick,
  onDelete,
  onSave,
  onEditFormChange,
  onOpenTagSearch,
  onOpenCategorySearch,
  onLoad,
}) => {
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:10000}}>
      <div style={{background:theme.card,borderRadius:12,padding:24,width:'67.5%',height:'60%',display:'flex',flexDirection:'column',position:'relative',boxShadow:'0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'}}>
        <div style={{display:'flex',alignItems:'center',marginBottom:16}}>
          {!isEditing ? (
            <h2 style={{margin:0,fontSize:18,fontWeight:700,color:theme.text}}>{modalData.title}</h2>
          ) : (
            <input value={editForm.title || ''} onChange={e => onEditFormChange({...editForm, title: e.target.value})} style={{flex:1,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:16}} />
          )}
          <button onClick={onClose} tabIndex={-1} style={{position:'absolute',top:-5,right:-5,background:'transparent',border:'none',fontSize:18,cursor:'pointer',color:'#ef4444',padding:'8px'}}>✕</button>
        </div>
        {!isEditing ? (
          <>
            <div style={{flex:1,overflowY:'auto',marginBottom:16}}>
              <div style={{marginBottom:12}}>
                <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Type:</p>
                <p style={{margin:0,fontSize:14,color:theme.text}}>{modalData.type}</p>
              </div>
              {modalData.link_url && (
                <div style={{marginBottom:12}}>
                  <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>URL:</p>
                  <p style={{margin:0,fontSize:14,color:theme.text}}><a href={modalData.link_url} target="_blank" rel="noopener noreferrer" style={{color:'#3b82f6',textDecoration:'underline'}}>{modalData.link_url}</a></p>
                </div>
              )}
              {modalData.tags && modalData.tags.length > 0 && (
                <div style={{marginBottom:12}}>
                  <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Tags:</p>
                  <p style={{margin:0,fontSize:14,color:theme.text}}>{modalData.tags.join(', ')}</p>
                </div>
              )}
              {modalData.categories && modalData.categories.length > 0 && (
                <div style={{marginBottom:12}}>
                  <p style={{margin:'0 0 4px 0',fontSize:12,fontWeight:600,color:theme.textMuted}}>Categories:</p>
                  <p style={{margin:0,fontSize:14,color:theme.text}}>{modalData.categories.join(', ')}</p>
                </div>
              )}
            </div>
            <div style={{display:'flex',gap:8,marginTop:'auto'}}>
              <button onClick={onEditClick} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:theme.text}}>✎ Edit</button>
              <button onClick={async () => {
                if (!confirm('Delete this resource?')) return
                try {
                  await onDelete()
                  onClose()
                } catch (err) {
                  alert('Delete failed — ' + ((err as any)?.message || 'check server logs'))
                }
              }} style={{background:'transparent',border:'1px solid #ef4444',borderRadius:4,padding:'8px 12px',cursor:'pointer',fontSize:13,color:'#ef4444'}}>✕ Delete</button>
            </div>
          </>
        ) : (
          <>
            <div style={{flex:1,display:'flex',gap:24,marginBottom:16,minWidth:0,overflowY:'auto'}}>
              {/* Left column - Main fields */}
              <div style={{flex:1,minWidth:0,paddingRight:12}}>
                <div style={{marginBottom:12}}>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>Type</label>
                  <select value={editForm.type || ''} onChange={e => onEditFormChange({...editForm, type: e.target.value})} style={{flex:1,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box',width:'100%'}}>
                    <option value="">Select a type</option>
                    {resourceTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div style={{marginBottom:12}}>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:4}}>URL</label>
                  <div style={{display:'flex',gap:4,minWidth:0}}>
                    <select value={editForm.link_protocol || 'https://'} onChange={e => onEditFormChange({...editForm, link_protocol: e.target.value})} style={{padding:'6px 4px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:12,flex:'0 0 auto',width:'85px',background:theme.bgSecondary,color:theme.text,boxSizing:'border-box'}}>
                      <option value="https://">https://</option>
                      <option value="http://">http://</option>
                    </select>
                    <input type="text" value={editForm.link_url || ''} onChange={e => onEditFormChange({...editForm, link_url: stripProtocol(e.target.value)})} placeholder="URL (optional)" style={{flex:1,padding:'6px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:6,fontSize:14,background:theme.bgSecondary,color:theme.text,boxSizing:'border-box',minWidth:0}} />
                  </div>
                </div>
              </div>

              {/* Right column - Tags & Categories */}
              <div style={{flex:'0 0 280px',borderLeft:`1px solid ${theme.borderColor}`,paddingLeft:16,overflowY:'auto',paddingRight:8}}>
                <div style={{marginBottom:20}}>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>Tags</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                    {(editForm.tags || []).map((tag: string) => (
                      <span key={tag} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 8px',background:'#3b82f6',color:'#fff',borderRadius:12,fontSize:12,fontWeight:500}}>
                        {tag}
                        <button onClick={() => onEditFormChange({...editForm, tags: (editForm.tags || []).filter((t: string) => t !== tag)}) } style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:12,lineHeight:1}}>✕</button>
                      </span>
                    ))}
                  </div>
                  <button onClick={onOpenTagSearch} style={{padding:'4px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:4,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:12,fontWeight:500}}>+ Add Tag</button>
                </div>

                <div>
                  <label style={{display:'block',fontSize:12,fontWeight:600,color:theme.textMuted,marginBottom:6,textTransform:'uppercase',letterSpacing:'0.5px'}}>Categories</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:8}}>
                    {(editForm.categories || []).map((cat: string) => (
                      <span key={cat} style={{display:'inline-flex',alignItems:'center',gap:4,padding:'4px 8px',background:'#10b981',color:'#fff',borderRadius:12,fontSize:12,fontWeight:500}}>
                        {cat}
                        <button onClick={() => onEditFormChange({...editForm, categories: (editForm.categories || []).filter((c: string) => c !== cat)}) } style={{background:'none',border:'none',color:'#fff',cursor:'pointer',padding:0,fontSize:12,lineHeight:1}}>✕</button>
                      </span>
                    ))}
                  </div>
                  <button onClick={onOpenCategorySearch} style={{padding:'4px 8px',border:`1px solid ${theme.borderColor}`,borderRadius:4,background:theme.bg,color:theme.text,cursor:'pointer',fontSize:12,fontWeight:500}}>+ Add Category</button>
                </div>
              </div>
            </div>
            <div style={{display:'flex',gap:12,marginTop:'auto',borderTop:`1px solid ${theme.borderColor}`,paddingTop:16}}>
              <button type="button" onClick={async () => {
                try {
                  if (!editForm.title || !editForm.title.toString().trim()) return alert('Title required')
                  await onSave()
                  onClose()
                } catch (err) {
                  console.error('Save error', err)
                  alert('Save failed — ' + ((err as any)?.message || 'check server logs'))
                }
              }} style={{flex:1,background:'#16a34a',border:'none',borderRadius:4,padding:'12px 16px',cursor:'pointer',fontSize:13,color:'#fff',fontWeight:600}}>Save</button>
              <button onClick={onClose} style={{flex:1,background:'transparent',border:`1px solid ${theme.borderColor}`,borderRadius:4,padding:'12px 16px',cursor:'pointer',fontSize:13,color:theme.text,fontWeight:600}}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
