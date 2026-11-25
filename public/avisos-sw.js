self.addEventListener('push',event=>{
  const aviso=event.data?.json()
  if(aviso)event.waitUntil(self.registration.showNotification('Férias na Praia',{body:aviso.texto,tag:'foto-'+aviso.id,data:{url:'/album?familia=1'}}))
})
self.addEventListener('notificationclick',event=>{
  event.notification.close()
  event.waitUntil(clients.openWindow('/album?familia=1'))
})
