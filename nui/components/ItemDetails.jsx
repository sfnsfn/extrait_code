import {
  Container,
  Content
} from './index.styles';

import { items, categoryLabels } from '../../../../config/items';
import { useState } from 'react';

const formatSpecialData = (key, value) => {
  switch (key) {
    case 'ammos':
      return `Munitions - ${value}`
    case 'suppressor':
      return `Silencieux équipé`
    case 'accessory_flashlight':
      return `Lampe torche équipé`
    case 'serial':
      return `Numéro de série - ${value}`
    case 'health':
      return `Santé - ${value}%`
    default:
      return ''
  }
}

const images = {}
const item_names = Object.keys(items)
for (let i = 0; i < item_names.length; i++) {
  const name = item_names[i]
  images[name] = new URL(`../../assets/img/items/${name}.png`, import.meta.url).href
}

const ItemDetails = ({item, pos}) => {

  return item && <Container
  onMouseLeave={() => a = false}
  style={{
    left: pos.x + 'px',
    top: pos.y + 'px',
    zIndex: '999',
    transform: 'translate(20px, -100%)'
  }}>
    <Content>
      <img draggable="false" src={images[item.name]}/>
      <div>
        <p>{items[item.name]?.label || item.name}{item.custom_name && <span style={{color: 'lightblue'}}> - {item.custom_name}</span>}</p>
        <p style={{opacity: "0.5"}}>Type de l'objet - {categoryLabels[items[item.name].type] || "Inconnu"}</p>
        <p style={{opacity: "0.5"}}>Taille de l'objet - {items[item.name]?.volume.toFixed(1) || 0} L</p>
      </div>
    </div>
    <div style={{margin: '0.5em 0'}}>
      {item.data && Object.keys(item.data).map(key =>
        <p key={key} style={{opacity: 0.75, color: 'lightcoral'}}>{formatSpecialData(key, item.data[key])}</p>
      )}
    </Content>
    <p>{items[item.name]?.description || 'Aucune description'}</p>
  </Container>
}

export default ItemDetails