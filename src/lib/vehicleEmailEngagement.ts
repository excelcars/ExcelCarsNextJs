export function summarizeVehicleEmailEngagement(link: { interactions: Array<{ interactionType: string }> }) {
  let callClicks = 0
  let whatsappClicks = 0
  let emailClicks = 0
  for (const interaction of link.interactions) {
    if (interaction.interactionType === 'call_click') callClicks += 1
    if (interaction.interactionType === 'whatsapp_click') whatsappClicks += 1
    if (interaction.interactionType === 'email_click') emailClicks += 1
  }
  return { callClicks, whatsappClicks, emailClicks }
}
