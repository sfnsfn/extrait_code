import React, { useCallback, useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import { useLocation, useNavigate } from 'react-router-dom'

import CountPicker from '@components/CountPicker'
import LabelSetter from '@components/LabelSetter'
import Loader from '../../components/Loader'
import { fetchData, subscribeEvent } from '../../lib/data'

import InventoryPane from './InventoryPane'
import Container from './Container'
import ItemDetails from './ItemDetails'
import DraggedItem from './DraggedItem'
import ItemInteraction from './ItemInteraction'
import RemoteContainer from './RemoteContainer'

import store from './store'

import { items } from '../../../../config/items'

import './index.mocks'

export const getItemVolume = item => {
  return items[item.name].volume * (item.quantity || 1)
}

const getContainerVolume = container => container.items.reduce(
  (prev, curr) => prev + (curr ? getItemVolume(curr) : 0),
  0
)

const Inventory = () => {

  const navigate = useNavigate()
  const state = useLocation().state

  const listenEscape = (e) => {
    if ((e.key === 'Escape' || e.key === 'Tab') && !loading) {
      navigate('/')
      if (import.meta.env.DEV) {
        console.log('escape pressed')
      } else {
        fetchData('INVENTORY:CLOSED')
      }
    }
  }
  const [containers, setContainers] = useState([])
  const [equipment, setEquipment] = useState(state.equipment)
  const [content, setContent] = useState(state.content)
  const [remoteEquipment, setRemoteEquipment] = useState(state.remoteEquipment)
  // const [shopId, setShopId] = useState(state.shopId)

  useEffect(() => {

    store.dispatch({type: 'REMOVE_DRAGGED_ITEM'})
    store.dispatch({type: 'REMOVE_DETAILED_ITEM'})
    setDraggedItem()
    setOrigin()
    setOriginIndex()

    setToSeparate()
    setSeparateInfos()
    setSeparateBackup()
    
    window.addEventListener('keydown', listenEscape)
    subscribeEvent('INVENTORY:UPDATE_CONTAINER', (data) => {
      setContent(data.content)
      setLoading(false)
      cancelSeparation()
      if (origin && origin === content) {
        store.dispatch({type: 'REMOVE_DRAGGED_ITEM'})
        setDraggedItem()
        setOrigin()
        setOriginIndex()
      }
    })

    return () => {
      window.removeEventListener('keydown', listenEscape)
    }
  }, [])

  const cancelSeparation = useCallback(() => {
    if (toSeparate) {
      if ('items' in separateBackup.origin) {
        separateBackup.origin.items[separateBackup.index] = separateBackup.item
      } else {
        separateBackup.origin[separateBackup.index] = separateBackup.item
      }
      setSeparateInfos()
      setToSeparate()
      setSeparateBackup()
    }
  })
  
  // supprime les containers de manière récursive (un container dans un container dans un container, etc.)
  const removeContainer = useCallback((container) => {
    if (container && container.items) {
      for (let i=0; i<container.items.length; i++) {
        const item = container.items[i]
        if (item && item.items && containers.includes(container)) {
          removeContainer(item)
        }
      }
      let idx = containers.indexOf(container)
      if (idx > -1) {
        containers[idx] = null
        savedPositions[idx] = null
        setContainers([...containers])
        setSavedPositions({...savedPositions})
      }
    }
  })
  
  const [draggedItem, setDraggedItem] = useState()
  const [origin, setOrigin] = useState()
  const [originIndex, setOriginIndex] = useState()
  
  const trashEl = document.getElementById('trash')
  const onMouseUp = useCallback((e) => {
    if (e.target === trashEl && !content) {
      const container = containers.find(c => c === draggedItem)
      if (container) {
        removeContainer(container)
      }
      if (!toSeparate) {
        if ('items' in origin) {
          origin.items[originIndex] = undefined
        } else {
          origin[originIndex] = undefined
        }
      }
      fetchData('INVENTORY:DROP_ITEM', {equipment, item:draggedItem, equipmentSlot: typeof originIndex == 'string' && originIndex})
    } else {
      cancelSeparation()
    }
    store.dispatch({type: 'REMOVE_DRAGGED_ITEM'})
    setDraggedItem()
    setOrigin()
  })

  const [isOriginInRemote, setIsOriginInRemote] = useState(false)

  const checkOriginInRemote = useCallback((_item) => {

    const find = (container, to_find) => {
      for (let i=0; i<container.items.length ;i++) {
        const item = container.items[i]
        if (item) {
          if (JSON.stringify(item) === JSON.stringify(to_find)) {
            return true
          } else if (item.items && find(item)) {
            return true
          }
        }
      }
      return false
    }
    if (content) {
      for (let i=0; i<content.length; i++) {
        if (content[i] && content[i].items && find(content[i], _item)) {
          setIsOriginInRemote(true)
          return
        }
      }
    }

    setIsOriginInRemote(false)

  })
  
  const onStart = useCallback((origin, index) => {

    if (!draggedItem) {
      store.dispatch({type: 'SET_DRAGGED_ITEM', payload: {
        item: origin.items[index],
        origin,
        index
      }})
      setDraggedItem(origin.items[index])
      setOrigin(origin)
      setOriginIndex(index)
      
      checkOriginInRemote(origin.items[index])
    }
  })
  
  const onStop = useCallback(async (target, index, shiftPressed, isRemote) => {

    store.dispatch({type:'REMOVE_DRAGGED_ITEM'})
    setDraggedItem()
    setOrigin()
    setOriginIndex()

    if (!draggedItem) {
      return
    }

    let targetItem = target.items[index]
    const targetFilter = items[target.name].filter
    const itemType = items[draggedItem.name].type

    const targetVolume = getContainerVolume(target)

    // Si le drag vient de l'inventaire ou du remote
    if (!origin.items) {
        
      let error;

      if (target === draggedItem) { 
        error = "contenant = dragged item"
      } else if (targetFilter && itemType != targetFilter) {
        error = "L'objet n'est pas du bon type"
      } else if (targetVolume + getItemVolume(draggedItem) > items[target.name].volume) {
        error = "Pas assez de place dans le container"
      } else if (toSeparate && targetItem) {
        error = "Le slot est déja occupé"
      }

      if (error) {
        console.log(error)
        cancelSeparation()
      } else {
        removeContainer(draggedItem)
        removeContainer(targetItem)
        let originalContent
        if (content) {
          originalContent = JSON.parse(JSON.stringify(content))
          if (separateBackup) {
          if ('items' in separateBackup.origin) {
            separateBackup.origin.items[separateBackup.index] = separateBackup.item
          } else {
            separateBackup.origin[separateBackup.index] = separateBackup.item
          }
          originalContent = JSON.parse(JSON.stringify(content))
          if ('items' in separateBackup.origin) {
            separateBackup.origin.items[separateBackup.index] = toSeparate
          } else {
            separateBackup.origin[separateBackup.index] = toSeparate
          }
        }
        }
        const originalItems = JSON.parse(JSON.stringify(target.items))
        let item = draggedItem
        if (targetItem && draggedItem.quantity && targetItem.name === draggedItem.name) {
          item = {...draggedItem, quantity: draggedItem.quantity + targetItem.quantity}
          targetItem = null
        }
        origin[originIndex] = toSeparate || targetItem
        target.items[index] = item
        setToSeparate()
        if (origin == content) {
          setLoading(true)
          const success = await fetchData('INVENTORY:UPDATE_CONTAINER', {
            originalContent,
            newContent: origin
          })
          if (!success) {
            cancelSeparation()
            setContent(originalContent)
            target.items = originalItems
          } else {
            setSeparateInfos()
            setToSeparate()
            setSeparateBackup()
            fetchData('INVENTORY:CHANGED', {equipment, which: typeof originIndex == 'string' ? originIndex : null})
          }
          setLoading(false)
        } else {
          setSeparateInfos()
          setToSeparate()
          setSeparateBackup()
          fetchData('INVENTORY:CHANGED', {equipment, which: typeof originIndex == 'string' ? originIndex : null})
        }
      }
      
    } else {
      if (draggedItem && draggedItem !== targetItem) {
        let error;

        const originVolume = getContainerVolume(origin)

        const itemVolume = getItemVolume(draggedItem)
        const swapVolume = targetItem ? getItemVolume(targetItem) : 0

        if (targetFilter && targetFilter !== itemType) {
          error = "L'objet n'est pas du bon type"
        } else if (target.items[index] && items[origin.name].filter && items[origin.name].filter !== items[target.items[index].name].type) {
          error = "L'objet n'est pas du bon type (2)"
        } else if (target !== origin && targetVolume + itemVolume - swapVolume > items[target.name].volume) {
          error = "La target n'a pas de place"
        } else if (target !== origin && originVolume + swapVolume - itemVolume > items[origin.name].volume) {
          error = "L'origin n'a pas de place"
        } else if (toSeparate && targetItem) {
          error = "L'emplacement est déja occupé"
        }

        if (error) {
          fetchData("PLAYER:NOTIFY", {type: "warning", message: error, time: 2000})
          cancelSeparation()
        } else {

          const originalItems = JSON.parse(JSON.stringify(origin.items))
          let originalContent;
          if (content)  {
            originalContent = JSON.parse(JSON.stringify(content))
            if (separateBackup) {
              if ('items' in separateBackup.origin) {
                separateBackup.origin.items[separateBackup.index] = separateBackup.item
              } else {
                separateBackup.origin[separateBackup.index] = separateBackup.item
              }
              originalContent = JSON.parse(JSON.stringify(content))
              if ('items' in separateBackup.origin) {
                separateBackup.origin.items[separateBackup.index] = toSeparate
              } else {
                separateBackup.origin[separateBackup.index] = toSeparate
              }
            }
          }
          
          if (targetItem && targetItem.name === draggedItem.name && !items[targetItem.name].isUnique) {
            target.items[index] = {
              ...targetItem,
              quantity: (targetItem.quantity || 1) + (draggedItem.quantity || 1) ,
            }
            origin.items[originIndex] = undefined
            fetchData('INVENTORY:CHANGED', {equipment})
          } else {
            if (shiftPressed && !targetItem && draggedItem.quantity > 1) {
              target.items[index] = {
                ...draggedItem,
                quantity: Math.floor(draggedItem.quantity / 2)
              }
              origin.items[originIndex] = {
                ...draggedItem,
                quantity: Math.ceil(draggedItem.quantity / 2)
              }
            } else {
              target.items[index] = draggedItem
              origin.items[originIndex] = toSeparate || targetItem
              // si l'origine == string -> si l'origine est un slot inventaire
            }

            if (isOriginInRemote) {
              setLoading(true)
              const success = await fetchData('INVENTORY:UPDATE_CONTAINER', {
                originalContent,
                newContent: content,
              })
              if (!success) {
                setContent(originalContent)
                origin.items = originalItems
                cancelSeparation()
              } else {
                setSeparateInfos()
                setToSeparate()
                setSeparateBackup()
                fetchData('INVENTORY:CHANGED', {equipment, which: typeof originIndex == 'string' ? originIndex : null})
              }
              setIsOriginInRemote(false)
              setLoading(false)
            } else {
              setSeparateInfos()
              setToSeparate()
              setSeparateBackup()
              fetchData('INVENTORY:CHANGED', {equipment, which: typeof originIndex == 'string' ? originIndex : null})
            }
          }
        }
      }
    }
  })

  const onInventoryStart = useCallback(which => {
    if (!draggedItem) {
      store.dispatch({type: 'SET_DRAGGED_ITEM', payload: {
        item: equipment[which],
        origin: equipment,
        index: which
      }})
      setDraggedItem(equipment[which])
      setOrigin(equipment)
      setOriginIndex(which)
    }
  })

  const onInventoryStop = useCallback(async (which, shiftPressed) => {

    store.dispatch({type:'REMOVE_DRAGGED_ITEM'})

    if (originIndex === which) {
      cancelSeparation()
      return;
    }

    const smallMaximumSize = 1.0
    const smallSlots = ['balls1', 'balls2', 'socket1', 'socket2']
    const actionSlots = ['equipped', 'pocket1', 'pocket2']

    let currentEquipment = equipment[which]
    const isOriginSmall = smallSlots.find(slot => equipment[slot] === draggedItem)
    const isOriginPocket = equipment['pocket1'] === draggedItem || equipment['pocket2'] === draggedItem


    if (draggedItem && draggedItem !== currentEquipment) {


      if (which === 'equipped' && equipment['equipped']
      && origin != content
      && !toSeparate
      && items[draggedItem.name].usableOn
      && !isOriginInRemote
      && (items[draggedItem.name].usableOn === 'any'
      || items[draggedItem.name].usableOn.includes(equipment['equipped'].name))) {
        draggedItem.USE = true
        fetchData('INVENTORY:USE_ITEM', {equipment, item:draggedItem})
      } else {

        let error;

        const itemType = items[draggedItem.name].type
        const shouldStack = currentEquipment && draggedItem.quantity && draggedItem.name == currentEquipment.name
        let _draggedItem = draggedItem
        if (shouldStack) {
          _draggedItem = {...draggedItem, quantity: draggedItem.quantity + (currentEquipment.quantity || 1)}
          currentEquipment = null
        }

        if (smallSlots.includes(which) && getItemVolume(_draggedItem) > smallMaximumSize) {
          error = "L'objet est trop volumineux pour ce spot"
        } else if (![...smallSlots, ...actionSlots].includes(which) && itemType !== which) {
          error = "L'objet n'est pas du bon type"
        } else if (currentEquipment && equipment[itemType] === _draggedItem && items[currentEquipment.name].type !== itemType) {
          error = "L'objet n'est pas du bon type"
        } else if (currentEquipment && isOriginSmall && getItemVolume(currentEquipment) > smallMaximumSize) {
          error = "L'objet est trop volumineux pour ce spot"
        } else if (['pocket1', 'pocket2'].includes(which) && getItemVolume(_draggedItem) > 1) {
          error = "L'objet est trop volumineux pour aller ici"
        } else if (currentEquipment && isOriginPocket && getItemVolume(currentEquipment) > 1) {
          error = "L'objet est trop volumineux pour aller ici"
        // } else if (currentEquipment.items && currentEquipment.items.includes(_draggedItem)) {
          // error = "Impossible de swap avec le container de l'item"
        } else if (currentEquipment && origin.items && items[origin.name].volume < getItemVolume(currentEquipment) - getItemVolume(_draggedItem)) {
          error = "Le conteneur d'origine n'a pas assez de place"
        } else if (currentEquipment && origin.items && origin == currentEquipment) {
          error = "Impossible de swap avec son conteneur"
        } else if (currentEquipment && origin && origin.items && items[origin.name].filter && !items[origin.name].filter.includes(draggedItem.name)) {
          error = "L'objet n'est pas du bon type"
        } else if (toSeparate && currentEquipment) {
          error = "Le slot est déja pris"
        } else if (["top", "legs", "shoes", "hat"].includes(which) && draggedItem["ped_model"] !== state["ped_model"]) {
          error = "Vous ne pouvez pas équiper cet objet."
        }
        
        if (error) {
          fetchData("PLAYER:NOTIFY", {type: "warning", message: error, time: 2000})
          cancelSeparation()
        } else {

          const originalEquipment = JSON.parse(JSON.stringify(equipment))
          let originalContent;
          if (content) {
            originalContent = JSON.parse(JSON.stringify(content))
            if (separateBackup) {
              if ('items' in separateBackup.origin) {
                separateBackup.origin.items[separateBackup.index] = separateBackup.item
              } else {
                separateBackup.origin[separateBackup.index] = separateBackup.item
              }
              originalContent = JSON.parse(JSON.stringify(content))
              if ('items' in separateBackup.origin) {
                separateBackup.origin.items[separateBackup.index] = toSeparate
              } else {
                separateBackup.origin[separateBackup.index] = toSeparate
              }
            }
          }
          let originalItems;

          const equipmentOrigin = Object.keys(equipment).find(slot => equipment[slot] === draggedItem)
          const shouldSplit = shiftPressed && _draggedItem.quantity > 1 && !currentEquipment
          equipment[which] = shouldSplit ? {..._draggedItem, quantity: Math.floor(_draggedItem.quantity/2)} : _draggedItem

          if ('items' in origin) {
            originalItems = JSON.parse(JSON.stringify(origin.items))
            origin.items[originIndex] = toSeparate ? toSeparate : shouldSplit ? {..._draggedItem, quantity: Math.ceil(_draggedItem.quantity/2)} : currentEquipment
          } else {
            origin[originIndex] = toSeparate ? toSeparate : shouldSplit ? {..._draggedItem, quantity: Math.ceil(_draggedItem.quantity/2)} : currentEquipment
          }
          // removeContainer(draggedItem) // en cas de glitch?
          
          if (content && (origin == content || isOriginInRemote)) {
            setLoading(true)
            const success = await fetchData('INVENTORY:UPDATE_CONTAINER', {
              originalContent: originalContent,
              newContent: content,
            })
            if (success) {
              fetchData('INVENTORY:CHANGED', {equipment, which, equipmentOrigin})
              setSeparateInfos()
              setToSeparate()
              setSeparateBackup()
            } else {
              cancelSeparation()
              setEquipment(originalEquipment)
              if (origin.items) {
                origin.items = originalItems
              } else {
                setContent(originalContent)
              }
            }
            setIsOriginInRemote(false)
            setLoading(false)
          } else {
            setSeparateInfos()
            setToSeparate()
            setSeparateBackup()
            fetchData('INVENTORY:CHANGED', {equipment, which, equipmentOrigin})
          }

        }
      }
    }

    setDraggedItem()
    setOrigin()
    setOriginIndex()
  })

  const onRemoteStart = useCallback((index) => {

    if (!draggedItem) {
      store.dispatch({type: 'SET_DRAGGED_ITEM', payload: {
        item: content[index],
        origin: content,
        index: index
      }})
      
      setOrigin(content)
      setOriginIndex(index)
      setDraggedItem(content[index])
    }
  })

  const onRemoteStop = useCallback((index, shiftKey) => {

    store.dispatch({type: 'REMOVE_DRAGGED_ITEM'})

    let container = containers.find(c => c == draggedItem)
    if (container && origin != content) {
      removeContainer(container)
    }

    if (originIndex === index && origin === content) {
      setDraggedItem()
      setOrigin()
      cancelSeparation()
      return;
    }

    let error;
    let targetItem = content[index]
    let item = draggedItem
    let has_splitted = false;

    if (!targetItem && item?.quantity > 1 && shiftKey && !toSeparate) {
      has_splitted = true
      targetItem = {
        ...item,
        quantity: Math.floor(draggedItem.quantity / 2)
      }
      item = {
        ...item,
        quantity: Math.ceil(draggedItem.quantity / 2)
      }
    }
    const volume = getContainerVolume({items:[...content, origin != content && item]})

    if (state.filter && !state.filter.includes[item.name]) {
      error = "item not in filter"
    } else if (volume > state.max_volume) {
      error = 'volume too big'
    } else {
      if (targetItem) {
        if (origin === equipment) {
          if (shiftKey) {
            error = "no shift key"
          }
          else if (['pocket1', 'pocket2', 'balls1', 'balls2', 'socket1', 'socket2'].includes(originIndex)) {
            if (getItemVolume(targetItem) > 2.0) {
              error = "volume too big to get in slot"
            }
          } else if (originIndex != 'equipped') {
            if (items[targetItem.name].type != originIndex) {
              error = "wrong type of item";
            }
          }
        } else if (origin.items) {
          if (shiftKey) { error = "no shift key" }
          else if (getContainerVolume(origin) + getItemVolume(targetItem) > items[origin.name].volume) {
            error = "volume too big for container"
          } else if (items[origin.name].filter) {
            if (!items[origin.name].filter.includes(targetItem.name)) {
              error = "wrong item for container filter"
            }
          }
          // error = ["???", {origin, originIndex}]
        }
      }
    }

    if (error) {
      console.log(error)
      setDraggedItem()
      setOrigin()
      cancelSeparation()
      return;
    }

    let originalContent = JSON.parse(JSON.stringify(content))
    if (separateBackup) {
      if ('items' in separateBackup.origin) {
        separateBackup.origin.items[separateBackup.index] = separateBackup.item
      } else {
        separateBackup.origin[separateBackup.index] = separateBackup.item
      }
      originalContent = JSON.parse(JSON.stringify(content))
      if ('items' in separateBackup.origin) {
        separateBackup.origin.items[separateBackup.index] = toSeparate
      } else {
        separateBackup.origin[separateBackup.index] = toSeparate
      }
    }

    const originalEquipment = JSON.parse(JSON.stringify(equipment))

    if (!has_splitted && targetItem && targetItem.name === item.name && 'quantity' in item) {
      item = {
        ...item,
        quantity: item.quantity + (targetItem.quantity || 1)
      }
      targetItem = null
    }

    if (origin.items) {
      origin.items[originIndex] = toSeparate || targetItem
    } else {
      origin[originIndex] = toSeparate || targetItem
    }
    content[index] = item

    setLoading(true)
    fetchData('INVENTORY:UPDATE_CONTAINER', {
     originalContent,
     newContent: content,
    }).then(async ({success}) => {
      setDraggedItem()
      setOrigin()
      setOriginIndex()
      if (!success) {
        cancelSeparation()
        setLoading(false)
        setContent(originalContent)
        setEquipment(originalEquipment)
      } else {
        setSeparateInfos()
        setToSeparate()
        setSeparateBackup()
        await fetchData('INVENTORY:CHANGED', {equipment, which: typeof originIndex == 'string' ? originIndex : null})
        setLoading(false)
      }
    })
  })

  const [lastMoved, setLastMoved] = useState()
  const onStartMove = useCallback((id) => setLastMoved(id))

  const [savedPositions, setSavedPositions] = useState({})
  const onContainerMove = useCallback((dragEvent, container_idx) => {
    savedPositions[container_idx] = {
      x: dragEvent.x,
      y: dragEvent.y
    }
    setSavedPositions({...savedPositions})
  })

  const [separateInfos, setSeparateInfos] = useState()
  const [toSeparate, setToSeparate] = useState()

  const [separateBackup, setSeparateBackup] = useState()

  const onSeparate = useCallback((position, item, source, index) => {

    if (typeof index === 'string') {
      source = equipment
    } else if (source === 'remote') {
      source = content
    } else {
      source = containers[source]
    }

    setSeparateInfos({
      position,
      item,
      origin: source,
      index
    })

  })

  const confirmSeparate = useCallback(quantity => {

    const {item, origin, index} = separateInfos

    store.dispatch({type: 'SET_DRAGGED_ITEM', payload: {
      item,
      origin,
      index
    }})

    setSeparateBackup({
      item: {...item},
      origin,
      index
    })

    setToSeparate({...item, quantity: item.quantity - quantity})
    item.quantity = item.quantity - quantity

    setDraggedItem({...item, quantity})
    setOrigin(origin)
    setOriginIndex(index)

    setSeparateInfos()
  })

  const onToggleContainer = useCallback((item, position) => {
    const alreadyOpen = containers.find(c => c === item)
    if (!alreadyOpen) {
      setContainers([...containers, item])
      setSavedPositions({
        ...savedPositions,
        [containers.length+1]: {
          x: 0,
          y: 0
        }
      })
    }
  })

  const [renameInfos, setRenameInfos] = useState()
  const onRename = useCallback((item, position, source) => {
    setRenameInfos({
      item,
      position,
      source
    })
  })

  const confirmRename = useCallback(value => {
    renameInfos.item.custom_name = value
    // setContainers([])
    console.log(renameInfos.source)
    setRenameInfos()
    // fetchData('INVENTORY:CHANGED', {equipment})
  })

  const onInteraction = useCallback((interactionName, args) => {
    fetchData('INVENTORY:ITEM_INTERACTION', {name:interactionName, args})
  })

  const onUse = useCallback((item) => {
    const equippedItem = equipment['equipped']
    if (equippedItem && (items[item.name].usableOn === 'any' || items[item.name].usableOn.includes(equippedItem.name))) {
      item.USE = true
      fetchData('INVENTORY:USE_ITEM', {equipment, item})
    } else {
      fetchData("PLAYER:NOTIFY", {type: "warning", message: `Impossible d'utiliser l'item: ${item.name} sur l'item: ${equippedItem ? equippedItem.name : 'NONE'}`, time: 2000})
    }
  })

  const [loading, setLoading] = useState(false)

  const onDeposit = useCallback(async () => {
    const container = containers.find(c => c === draggedItem)
    if (container) {
      removeContainer(container)
    }
    if ('items' in origin) {
      origin.items[originIndex] = undefined
    } else {
      origin[originIndex] = undefined
    }
    store.dispatch({type: 'REMOVE_DRAGGED_ITEM'})
    setDraggedItem()
    setOrigin()
    await fetchData('INVENTORY:CHANGED', {equipment})
    setLoading(false)
  })

  const onTakeItem = useCallback(async (item, slot, container, inBag) => {

    setLoading(true)

    const original = {...remoteEquipment}

    if (typeof slot === 'string') {
      remoteEquipment[slot] = null
    } else {
      containers[container].items[slot] = null
    }
    
    const success = await fetchData('INVENTORY:STEAL_ITEM', {original, changed: {...remoteEquipment}, item, inBag, slot})

    if (success) {
      const isContainer = containers.find(c => c === item)
      if (isContainer) {
        removeContainer(item)
      }
      if (typeof slot === 'string') {
        setRemoteEquipment({...remoteEquipment})
      } else {
        setContainers([...containers])
      }
    } else {
      // error
      if (typeof slot === 'string') {
        setRemoteEquipment({...original})
      } else {
        containers[container].items[slot] = item
        setContainers([...containers])
      }
    }
    setLoading(false)
    
  })

  return <Provider store={store}>
    <div
    onMouseUp={(e) => draggedItem && onMouseUp(e)}
    onMouseDown={() => store.getState().interactedItem && store.dispatch({type:'REMOVE_INTERACTED_ITEM'})}
    style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      alignItems: 'center',
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: "hidden",
      cursor: draggedItem ? 'pointer' : 'initial',
    }}>
    <div style={{ width: '100%', height: '100%', position: 'absolute'}} id="trash" />

    {/* Inventaire joueur */}
    {!remoteEquipment ? <InventoryPane
      equipment={equipment}
      onStart={(which) => onInventoryStart(which)}
      onStop={(which, shiftPressed) => onInventoryStop(which, shiftPressed)}
      onDoubleClick={onToggleContainer}
    />
    : <div></div>}
    
    {/* Containers (sac, etc.) */}
    <div style={{position: 'relative', width:'100%', background: 'red'}}>
      {containers.map((container, idx) => container && <Container key={idx}
        items={container.items}
        name={container.name}
        lastPos={savedPositions[idx]}
        onContainerMove={(mouseEvent, dragEvent) => onContainerMove(dragEvent, idx)}
        onClose={() => removeContainer(container)}
        onStart={(index) => onStart(container, index)}
        onStop={(index, shiftPressed) => onStop(container, index, shiftPressed)}
        lastMoved={lastMoved === container.id}
        onStartMove={() => onStartMove(container.id)}
        isRemote={!!remoteEquipment}
        onDoubleClick={onToggleContainer}
        id={idx}
      />)}
    </div>

    {/* Inventaire joueur fouillé */}
    {remoteEquipment && <InventoryPane isRemote
    equipment={remoteEquipment}
    onDoubleClick={onToggleContainer}
    />}

    {/* Remote container (coffre, etc) */}
    {content && <RemoteContainer name={state.name}
      content={content}
      max_volume={state.max_volume}
      onDeposit={onDeposit}
      remoteType={state.remoteType}
      setLoading={setLoading}
      onStart={onRemoteStart}
      onStop={(i, s) => draggedItem && onRemoteStop(i, s)}
      onDoubleClick={onToggleContainer}
    />}
    <ItemDetails/>
    <DraggedItem />
    <ItemInteraction
      onSeparate={onSeparate}
      onToggleContainer={onToggleContainer}
      onRename={onRename}
      onUse={onUse}
      onInteraction={onInteraction}
      onTakeItem={onTakeItem}
    />
    {separateInfos && <CountPicker pos={separateInfos.position} max={separateInfos.item.quantity-1} min={1} onConfirm={confirmSeparate} onClose={() => setSeparateInfos()}/>}
    {renameInfos && <LabelSetter pos={renameInfos.position} defaultValue={renameInfos.item.custom_name} onConfirm={confirmRename} onClose={() => setRenameInfos()}/>}
    <Loader noblur state={loading} />
  </div>
  </Provider>
}

export default Inventory